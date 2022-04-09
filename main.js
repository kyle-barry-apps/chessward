// Establish empty global list for games
let games = [];

// Utility function to read NDJSON 
const readStream = processLine => response => {

  // Reset games list so handle_data doesn't run
  games = [];
  
  if (response.status === 200) {

    // Turn on loading screen once response is good
    render_loading();

    const stream = response.body.getReader();
    const matcher = /\r?\n/;
    const decoder = new TextDecoder();
    let buf = '';
  
    const loop = () =>
      stream.read().then(({ done, value }) => {
        if (done) {
          if (buf.length > 0) processLine(JSON.parse(buf));
        } else {
          const chunk = decoder.decode(value, {
            stream: true
          });
          buf += chunk;
  
          const parts = buf.split(matcher);
          buf = parts.pop();
          for (const i of parts.filter(p => p)) processLine(JSON.parse(i));
          return loop();
        }
      });
  
    return loop();

  }
  else {
    // Create User not found message if we get 404 error
    const content_container = document.querySelector('.content-container');
    element = document.createElement('div');
    element.id = 'not-found';
    element.classList.add('not-found');
    element.innerText = 'User not found! Try again?'
    content_container.appendChild(element);
    console.log(response.status);

  }

}

// What happens when submit button is clicked
function submit_action() {

  // Get user input and clear input value
  const player_input = document.getElementById('player-input');
  const player = player_input.value;
  player_input.value = ''

  // Clear not found error and current graph container if exists
  if (document.contains(document.getElementById('not-found'))) {
    document.getElementById('not-found').remove();
  }

  if (document.contains(document.getElementById('graph-container'))) {
    document.getElementById('graph-container').remove();
  }

  // Fetch data and pass to utility function
  const stream = fetch(`https://lichess.org/api/games/user/${player}?perfType=&max=`,{headers:{Accept:'application/x-ndjson'}});

  // Add each game to games list
  const onMessage = obj => games.push(obj);
  const onComplete = () => {
    // Pass to handle data function if there is at least one game
    if (games.length > 0) {
      handle_data(games, player);
    }
    else {
      return;
    }
  }
  
  stream
    .then(readStream(onMessage))
    .then(onComplete)
}

function handle_data (games, player) {
  
  games.forEach(function (game) {

    // Declare variables here and change value inside if/else
    let black_player;
    let white_player;
    
    // Get black and white player user names and store winner color

    if (game.players.black.hasOwnProperty('aiLevel')) {
      black_player = 'Stockfish';
    } else {
      black_player = game.players.black.user.name;
    }

    if (game.players.white.hasOwnProperty('aiLevel')) {
      white_player = 'Stockfish';
    } else {
      white_player = game.players.white.user.name;
    }

    const winner = game.winner;

    // Get player color to match with winner color

    if (player === white_player) {
      game.player_color = "white";
    } else {
      game.player_color = "black";
    }

    // Get result of game for player in question

    if (game.player_color === winner) {
      game.result = "win";
    } else {
        if (winner != "black" & winner != "white") {
          game.result = "draw";
        }
        else {
          game.result = "loss";
        }
    }

    // Establish numbers for correspondence games
    let initial = game.speed === 'correspondence' ? 86400 : game.clock.initial;
    let increment = game.speed === 'correspondence' ? 0 : game.clock.increment;

    // Get some timing data for time control breakdown graphs
    // Get timing in minutes
    initial = (initial/60).toString();
    increment = increment.toString();
    game.time_control = initial + "+" + increment;
    })
  
  let data_list = {};

  const all = games;

  // Return filtered lists of all major time controls on lichess
  const thirty_plus_twenty = games.filter(function(game) {
    return game.time_control == "30+20";
  })

  const thrity_plus_zero = games.filter(function(game) {
    return game.time_control == "30+0";
  })

  const fifteen_plus_ten = games.filter(function(game) {
    return game.time_control == "15+10";
  })

  const ten_plus_five = games.filter(function(game) {
    return game.time_control == "10+5";
  })

  const ten_plus_zero = games.filter(function(game) {
    return game.time_control == "10+0";
  })

  const five_plus_three = games.filter(function(game) {
    return game.time_control == "5+3";
  })

  const five_plus_zero = games.filter(function(game) {
    return game.time_control == "5+0";
  })

  const three_plus_two = games.filter(function(game) {
    return game.time_control == "3+2";
  })

  const three_plus_zero = games.filter(function(game) {
    return game.time_control == "3+0";
  })

  const two_plus_one = games.filter(function(game) {
    return game.time_control == "2+1";
  })

  const one_plus_zero = games.filter(function(game) {
    return game.time_control == "1+0";
  })

  const correspondence = games.filter(function(game) {
    return game.time_control == "10000+1";
  })

  data_list['All'] = all;
  data_list['Correspondence'] = correspondence;
  data_list['1+0'] = one_plus_zero;
  data_list['2+1'] = two_plus_one;
  data_list['3+0'] = three_plus_zero;
  data_list['3+2'] = three_plus_two;
  data_list['5+0'] = five_plus_zero;
  data_list['5+3'] = five_plus_three;
  data_list['10+0'] = ten_plus_zero;
  data_list['10+5'] = ten_plus_five;
  data_list['15+10'] = fifteen_plus_ten;
  data_list['30+0'] = thrity_plus_zero;
  data_list['30+20'] = thirty_plus_twenty;
  
  // Filter out empty tcs
  Object.keys(data_list).forEach(key => {
    if (data_list[key].length === 0) {
      delete data_list[key]
    }
  })

  // Pass WLD function data
  get_wld(data_list, player);
}

function get_wld(data_list, player) {

  for_graphs_list = [];

  // Loop through datalist object and get wld for each tc
  Object.keys(data_list).forEach(tc => {

    let win_total = 0;
    let loss_total = 0;
    let draw_total = 0;
  
    // Loop through games and get wld totals (can optimize)
    data_list[tc].forEach(function (game) {
      if (game.result === 'win') {
        win_total += 1;
      } else if (game.result === 'loss') {
        loss_total += 1;
      } else {
        draw_total += 1;
      }
    })
    
    // Get percentage 
    const win_perc = ((win_total / data_list[tc].length) * 100).toFixed(2);
    const loss_perc = ((loss_total / data_list[tc].length) * 100).toFixed(2);
    const draw_perc = ((draw_total / data_list[tc].length) * 100).toFixed(2);
  
    for_graphing = {
      win_total: win_total,
      loss_total: loss_total,
      draw_total: draw_total,
      win_perc: win_perc,
      loss_perc: loss_perc,
      draw_perc: draw_perc,
      total: data_list[tc].length,
      player: player,
      name: tc
    }

    for_graphs_list.push(for_graphing);
  
  })
  render_graphs(for_graphs_list);

}

//View
function render_graphs(for_graphs_list) {
  // Kill the loading screen
  kill_loading();

  // Create html elements for each time control
  let element = document.createElement('div');
  element.id = 'graph-container';
  element.classList.add('graph-container');

  for_graphs_list.forEach(tc => {

    let graph_canvas = document.createElement('canvas');
    graph_canvas.classList.add('canvas');
    graph_canvas.id = 'graph' + '-' + tc.name;
    element.appendChild(graph_canvas);

  })

  body = document.querySelector('body');
  body.appendChild(element);

  // Loop through the list of tc data and create graph for each
  for_graphs_list.forEach(tc => {

    // let graph_canvas = document.createElement('canvas');
    // graph_canvas.id = 'graph' + '-' + tc.name;
    // element.appendChild(graph_canvas);

    // Produce chart and pass in data from get_wld function
    let the_chart = document.getElementById('graph' + '-' + tc.name).getContext('2d');
  
    let chart = new Chart(the_chart, {
      type: 'doughnut', // bar, horizontalbar, pie, line, doughnut, radar, polarArea
      data: {
        labels: ['Win', 'Loss', 'Draw'],
        datasets: [{
          label: `${tc.player} Results Breakdown`,
          data: [
            tc.win_total,
            tc.loss_total,
            tc.draw_total
          ],
          backgroundColor: [
            'rgba(255, 96, 0, .8)',
            'rgba(255, 219, 198, .8)',
            'rgba(113, 41, 0, .8)',
          ],
          borderWidth: 1,
          borderColor: '#777',
          hoverBorderWidth: 3,
          hoverBorderColor: '#000'
        }]
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: `${tc.name} Results`,
            font: {
              size: 30
            }
          },
          legend: {
            position: 'top',
          },
          layout: {
          }
      }
      }
    })
  })

}

function render_loading() {

  //Make content container disappear for the time being
  const content_container = document.querySelector('.content-container');
  content_container.style.opacity = 0;

  // Get loader div and turn on
  const loader = document.querySelector('.loader');
  loader.className = "loader on";

}

function kill_loading() {

  //Make content container disappear for the time being
  const content_container = document.querySelector('.content-container');
  content_container.style.opacity = 1;

  // Get loader div and turn off
  const loader = document.querySelector('.loader');
  loader.className = "loader off";
}