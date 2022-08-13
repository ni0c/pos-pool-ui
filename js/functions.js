const _CORE = 'core';
const _ESPACE = 'espace';
const _NAMES = { 'core': 'Core Space', 'espace': 'eSpace'};



function confluxRequest(options) {
  if (conflux.isFluent) {
    return conflux.request(options);
  } else {
    const params = options.params || [];
    return conflux.send(options.method, ...params);
  }
}

function updateUIData(key, value, animated=true) {

  clog.log("updateUIData", key, value, animated);

  if ($("input[data-id='"+key+"']").length)
  {
    $("input[data-id='"+key+"']").val(value);
    return;
  } 
  if ($("textarea[data-id='"+key+"']").length)
  {
    $("textarea[data-id='"+key+"']").val(value);
    return;
  }

  if (animated) {
    $("[data-id='"+key+"']").each(function() {
      countAnimation(this, value);
    });
    return;
  }

  $("[data-id='"+key+"']").text(value);
}

function updateUIData2(key, value, animated=true, animationTime=1500) {

  clog.log("updateUIData2", key, value, animated);

  if (animated) {
    $("[data-id='"+key+"']").each(function() {
      countAnimation2(this, value, animationTime);
    });
    return;
  }

  $("[data-id='"+key+"']").text(value);
}

function updateUILink(key, value) {
  $("[data-id='"+key+"']").attr("href", value);
}

function updateUItitle(key, value) {
  $("[data-id='"+key+"']").attr("title", value);
}

function updateUItable(key, value) {
  $("[data-tbody-id='"+key+"']").html(value);
}

function updateConnectedState(network, state='online') {
  let key = network + ".conn-indicator";
  let key2 = network + '.userInfo.connected';

  $("[data-id='"+key+"']").removeClass("offline").removeClass("online").removeClass("paused").addClass(state);
  switch (state) {
    case 'online':
    case 'paused':
      $("[data-id='"+key2+"']").text("Connected:");
      break;
    case 'offline':
      $("[data-id='"+key2+"']").text("Not Connected");
      break;
  }
}
  
function shortPosAddress(addr) {
  const start = addr.slice(0, 6);
  return `${start}...`;
}

function shortenAccount(account) {
  if (account.match(':')) {
    return TreeGraph.address.shortenCfxAddress(account);
  } else {
    return `${account.slice(0, 6)}...${account.slice(-4)}`;
  }
}

function shortenHash(hash) {
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

function makeHashLink(hash, network) {
  let url;
  if (network == _CORE) {
    url = CORE_MAIN_NET.txurl + hash;
  } else {
    url = ESPACE_MAIN_NET.txurl + hash;
  }

  let shortHash = shortenHash(hash);

  let link = '<a href="'+url+'">'+shortHash+'</a>';

  return link;
}

function showHashPopup(hash, network) {
  let link = makeHashLink(hash, network);
  showNotice("🔄 Transaction submitted. Hash: " + link);
}

function showHashReadyPopup(hash, network) {
  let link = makeHashLink(hash, network);
  showNotice("✅ Transaction confirmed. Hash: " + link);
}

function showHashErrorPopup(msg, hash, network) {
  let link = makeHashLink(hash, network);
  showError(msg + ' Hash: ' + link);
}


function formattedCFX(cfx) {
  if (cfx == 0) return 0;
  return prettyFormat2(cfx.toString());
}

function initLineChart(rewards,color="#0084ff") {
  const { list } = rewards.data;
  //clog.log(rewards);
  //let labels = list.map(item => formatTimeW(new Date(item.createdAt)));
  let labels = list.map(item => new Date(item.createdAt));
  let labelsX = list.map(item => item.createdAt);
  let items = list.map(item => {
    const formated = formatUnit(item.reward, 'CFX');
    const onlyValue = formated.split(' ')[0];
    return Number(onlyValue);
  });

  let tdays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ];

  labels = labels.reverse();
  items = items.reverse();

  //clog.log(labels);
  //clog.log(items);

  let thr = 25;
  let tthisTime = -1;
  let tthisDay = "X";

  for(let i = 0; i < labelsX.length; i++) {
    let tdate = labels[i];
    let tndate = new Date();
    let tnday = tndate.getDay();
    let tday = tdate.getDay();
    let thour = tdate.getHours();

    if (tday == tnday)
    {
      if (thour < thr)
      {
        thr = thour;
        tthisTime = labels[i];
        tthisDay = tdays[tday];
      }
    }

    
  }

  let _arr1 = [
    ['x', ...labels],
    ['CFX rewards per hour', ...items]
  ];

  document.getElementById('reward-chart-wrapper').removeAttribute('style');

  //clog.log("tthisTime", tthisTime, " tthisDay", tthisDay);

  chart.instance = c3.generate({
    bindto: "#reward-chart",
    data: {
      x: "x",
      columns: _arr1,
      type: "bar",
      types: {
        "CFX rewards per hour": "bar",
      },
      axes: {
        "CFX rewards per hour": "y"
      },
      colors: {
        "CFX rewards per hour": color,
      },
    },
    grid: {
      x: {
        lines: [
          { value: tthisTime, text: tthisDay}
        ]
      }
    },
    axis: {
      "y": {
          show: true,
          label: "CFX rewards per hour"
      },
      x: {
        type: "timeseries",
        
        tick: {
          format: "%H:%M"
        }
      }
    }
  });
}



function showTimedNotice(msg, _timeout = 3000) {
  $("#popup3 .popup-content-text").html(msg);
  showPopup("popup3");
  return setTimeout(function () { closePopup("popup3"); }, _timeout);
}

function showPopup(Id) {
  clog.log("popup open");
  if (Id == "popup" || Id == "popup4") {
    closePopup("popup2");
    closePopup("popup3");
    document.getElementById(Id).style.width = "100%";
    $("#" + Id + " .popup-close-button").show();
  } else {
    document.getElementById(Id).style.height = "auto";
    $("#" + Id + " .popup-close-button").show();

  }
}


function closePopup(Id) {
  clog.log("popup close");

  if (Id == "popup" || Id == "popup4") {
    $("#" + Id + " .popup-close-button").hide();
    document.getElementById(Id).style.width = "0%";
  } else {
    document.getElementById(Id).style.height = "0%";
    $("#" + Id + " .popup-close-button").hide();
    $("#" + Id + " .popup-content-text").html('');
    $("#" + Id + " .popup-content-text").removeClass("popup-error");
    $("#" + Id + " .popup-content-text").removeClass("popup-notice");
  }
}

function showError(msg) {
  let Id = 'popup2';
  $("#" + Id + " .popup-content-text").html('ℹ️ ' + msg);
  $("#" + Id + " .popup-content-text").addClass("popup-error");
  showPopup(Id);
}

function showNotice(msg) {
  let Id = 'popup2';
  $("#" + Id + " .popup-content-text").html(msg);
  $("#" + Id + " .popup-content-text").addClass("popup-notice");
  showPopup(Id);
}

function hideNotice() {
  let Id = 'popup2';
  closePopup(Id);
}


function connectWalletCore() {
  posPool.core.connectWallet();
}
	
function connectWalletESpace() {
	posPool.espace.connectWallet();  
}



function toggleFaq(faq) {
  let isHidden = $('.info-faq-text[data-faq="' + faq + '"]').is(":hidden");

  let html = '<i class="far fa-plus-square"></i>';
  if (isHidden) {
    html = '<i class="far fa-minus-square"></i>';
  }
  $('.info-faq-toggle[data-faq="' + faq + '"]').html(html);
  $('.info-faq-text[data-faq="' + faq + '"]').toggle(100);
}

async function usleep(n = 1000) {
  await new Promise(resolve => setTimeout(resolve, n));
}

const ONE_VOTE_CFX = 1000;

function trimPoints(str) {
  const parts = str.split('.');
  if (parts.length != 2) {
    return str;
  }
  return `${parts[0]}.${parts[1].substr(0, 4)}`;
}

function voteToCFX(vote) {
  return BigInt(vote.toString()) * BigInt(ONE_VOTE_CFX);
}

function paddingZero(value) {
  return value < 10 ? `0${value}` : value;
}

function formatDateTime(date) {
  return `${date.getFullYear()}-${paddingZero(date.getMonth() + 1)}-${paddingZero(date.getDate())} ${paddingZero(date.getHours())}:${paddingZero(date.getMinutes())}:${paddingZero(date.getSeconds())}`;
}

function formatTime(date) {
  return `${paddingZero(date.getHours())}:${paddingZero(date.getMinutes())}:${paddingZero(date.getSeconds())}`;
}

function formatTimeW(date) {
  return `${date.getFullYear()}-${paddingZero(date.getMonth()+1)}-${paddingZero(date.getDate())} ${paddingZero(date.getHours())}:${paddingZero(date.getMinutes())}:${paddingZero(date.getSeconds())}`;
}

function requestAccounts() {
  if (conflux.isFluent) {
    return conflux.request({
      method: "cfx_requestAccounts"
    });
  } else {
    return conflux.send("cfx_requestAccounts");
  } 
}

const Units = [{
  name: 'T',
  exp: 30,
}, {
  name: 'G',
  exp: 27,
}, {
  name: 'M',
  exp: 24,
}, {
  name: 'K',
  exp: 21,
}, {
  name: 'CFX',
  exp: 18,
}, {
  name: 'mCFX',
  exp: 15,
}, {
  name: 'uCFX',
  exp: 12,
}, {
  name: 'GDrip',
  exp: 9,
}, {
  name: 'MDrip',
  exp: 6,
}, {
  name: 'KDrip',
  exp: 3,
}, {
  name: 'Drip',
  exp: 0,
}];

const Units2 = [{
  name: 'T',
  exp: 30,
}, {
  name: 'G',
  exp: 27,
}, {
  name: 'M',
  exp: 24,
}, {
  name: 'K',
  exp: 21,
}, {
  name: '',
  exp: 18,
}, {
  name: 'm',
  exp: 15,
}, {
  name: 'u',
  exp: 12,
}, {
  name: 'GD',
  exp: 9,
}, {
  name: 'MD',
  exp: 6,
}, {
  name: 'KD',
  exp: 3,
}, {
  name: 'D',
  exp: 0,
}];

const TEN = new Big(10);

// use big.js to format
function prettyFormat(value) {
  const bigValue = new Big(value);
  for (let i = 0; i < Units.length; i++) {
    const toCompare = TEN.pow(Units[i].exp);
    if (bigValue.gte(toCompare)) {
      //let tval = bigValue.div(toCompare).toFixed(3);
      let tval = Math.round(bigValue.div(toCompare)*100)/100;
      return `${tval} ${Units[i].name}`;
    }
  }
}

function prettyFormat2(value) {
  const bigValue = new Big(value);
  for (let i = 0; i < Units2.length; i++) {
    const toCompare = TEN.pow(Units2[i].exp);
    if (bigValue.gte(toCompare)) {
      //let tval = bigValue.div(toCompare).toFixed(3);
      let tval = Math.round(bigValue.div(toCompare)*100)/100;
      return `${tval} ${Units2[i].name}`;
    }
  }
}


function formatUnit(value, unitName) {
  //clog.log("formatUnit",value);
  const bigValue = new Big(value);
  for (let i = 0; i < Units.length; i++) {
    if (Units[i].name === unitName) {
      return `${bigValue.div(TEN.pow(Units[i].exp)).toFixed(3)} ${unitName}`;
    }
  }
  return value;
}

function formatCFX(value) {
  let unitName = "CFX";
  //clog.log("formatUnit",value);
  const bigValue = new Big(value);
  for (let i = 0; i < Units.length; i++) {
    if (Units[i].name === unitName) {
      return bigValue.div(TEN.pow(Units[i].exp)).toFixed(3);
    }
  }
  return value;
}

function feeRatio(ratio) {
  // clog.log("feeRatio", ratio);
  return (10000-Number(ratio))/100;
};

function bnToBigInt(bn) {
  return BigInt(bn.toString());
}

function getInputValue(id) {
  return $("[data-input-id='"+id+"'").val();
}

function setInputValue(id, val) {
  return $("[data-input-id='"+id+"'").val(val);
}

async function countAnimation(targetEl, end, duration=1500, start=0) {
  let startTimestamp = null;
  function step(timestamp) {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    targetEl.innerText = Math.floor(progress * (end - start) + start);
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else
    {
      targetEl.innerText = end;
    }
  };
  window.requestAnimationFrame(step);
};

async function countAnimation2(targetEl, end, duration=2000, start=0) {
  let _end = String(end);
  let hasSplit = (_end.indexOf(' ') > -1);
  let end2 = end;
  let newEnd = "";
  if (hasSplit) {
    let endArr = _end.split(" ");
    end2 = endArr.shift();
    newEnd = " " + endArr.join(" ");
    //clog.log(endArr, end2, newEnd);
  }
  let startTimestamp = null;
  let fps = 20;
  let lastFramets = null;
  let draw = false;
  let isInt = false;
  let decs = 2;
  if (String(Math.floor(end2)) === String(end2))
  {
    isInt = true;
  } else 
  {
    let end3 = String(end2);
    let end3arr = end3.split('.');
    decs = end3arr[1].length;
  }
  //clog.log("countAnimation2.isInt", isInt);
  function step2(timestamp) {
    
    //clog.log(1000/(timestamp-lastTimestamp) + " fps");
    if (!startTimestamp) {
      startTimestamp = timestamp;
      draw = true;
    }
    if ((timestamp-lastFramets) >= (1000/fps))
    {
      draw = true;
    }
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    if (draw) {
      let calc;
      if (isInt) {
        calc = Math.floor(progress * (end2 - start) + start);
      } else {
        calc = (Math.floor(((progress * (end2 - start) + start)*100))/100).toFixed(decs);
      }
      targetEl.innerText = calc + "" + newEnd;
      draw = false;
      lastFramets = timestamp;
    }
    if (progress < 1) {
      window.requestAnimationFrame(step2);
    } else
    {
      targetEl.innerText = end;
    }
  };
  window.requestAnimationFrame(step2);
};

const clog = {

  log: function(...str) {
    if (!DEBUG) {
      return;
    }
    console.log(...str);
    
  }
}

async function initDataElements() {
  document.querySelectorAll('[data-id]').forEach(function(el) {
    if (el.innerHTML == "") {
      el.innerHTML = "_";
    }
  });
}

async function checkAnim() {

  let animPlaying = true;
  if (localStorage.getItem('bgAnim') == 'false')
  {
    animPlaying = false;
  }
  
  if (animPlaying) { 
    localStorage.setItem('bgAnim', 'true');
    return; 
  }

  animPause();
 
  if (isAppleDevice)
  {
    setTimeout(function(){ animPause(); }, 300);
    setTimeout(function(){ animPause(); }, 600);
    setTimeout(function(){ animPause(); }, 900);
  }

}

async function animToggleClick() {
  var _el = document.getElementById('videoEl');
  if (_el.paused) {
    localStorage.setItem('bgAnim', 'true');
    animPlay();	
  } else {
    localStorage.setItem('bgAnim', 'false');
    animPause();
  }		
}

async function animPause() {
	var _el = document.getElementById('videoEl');
  if (_el.paused) {
    return;
  }
  _el.pause();
  animPauseIcon();

}

async function animPlay()
{
	var _el = document.getElementById('videoEl');
  if (!_el.paused) {
    return;
  }

  animPlayIcon();

  if (isAppleDevice) {
    _el.controls = false;
    _el.setAttribute('webkit-playsinline', 'webkit-playsinline');
    _el.setAttribute('playsinline', 'playsinline');
    _el.load();
    return;
  }	
  _el.play();
  
}

async function animPauseIcon()
{
	$("#bg-anim-toggle i").removeClass("fa-play").removeClass("fa-pause").addClass("fa-pause");
	$("#bg-anim-text").text(" Resume background animation");
}

async function animPlayIcon()
{
	$("#bg-anim-toggle i").removeClass("fa-play").removeClass("fa-pause").addClass("fa-play");
	$("#bg-anim-text").text(" Pause background animation");
}