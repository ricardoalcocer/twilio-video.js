'use strict';

var realm = getURLParameter('realm');

function getURLParameter(name) {
  return decodeURIComponent(
      (new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [,''])[1]
        .replace(/\+/g, '%20')
    ) || null;
}

// Preview
// =======

var previewStream = null;
var previewBtn = setupPreviewBtn(document.getElementById('js-preview-btn'));
var previewClose = setupPreviewClose(document.getElementById('js-preview-close'));
var previewDiv = document.getElementById('js-preview-video');
var previewVideo = null;

function setupPreviewBtn(previewBtn) {
  previewBtn.onclick = function onclick(e) {
    e.preventDefault();
    previewBtn.blur();
    Twilio.Signal.Stream.getUserMedia().then(function(_previewStream) {
      previewStream = _previewStream;
      previewVideo = previewStream.attach();
      previewDiv.appendChild(previewVideo);
      hide(previewBtn);
      unhide(previewDiv);
    });
  };
  return previewBtn;
}

function setupPreviewClose(previewClose) {
  previewClose.onclick = function onclick(e) {
    e.preventDefault();
    previewClose.blur();
    previewStream.stop();
    previewStream = null;
    previewDiv.removeChild(previewVideo);
    hide(previewDiv);
    unhide(previewBtn);
  };
  return previewClose;
}

// Log In
// ======

var statusImg = document.getElementById('js-status-img');
var statusText = document.getElementById('js-status-text');

var loginValue = document.getElementById('js-login-value');
var loginBtn = setupLoginBtn(document.getElementById('js-login-btn'));
var loginAlert = document.getElementById('js-login-alert');

var loggedIn = null;

function setupLoginBtn(loginBtn) {
  loginBtn.onclick = function(e) {
    e.preventDefault();
    loginBtn.blur();
    var restore;
    if (loggedIn) {
      restore = loggingOut();
      logOut(function(error) {
        if (error) {
          return restore(error);
        }
        didLogOut();
      });
    } else {
      restore = loggingIn();
      var name = loginValue.value;
      if (!name) {
        return restore('You must specify a name.');
      }
      logIn(loginValue.value, function(error, endpoint) {
        if (error) {
          return restore(error);
        }
        endpoint.on('invite', function(invite) {
          if (loggedIn !== endpoint || (callInProgress && callInProgress !== invite.conversation)) {
            return;
          }
          incoming(invite);
        });
        didLogIn(endpoint);
      });
    }
  };
  return loginBtn;
}

var incomingStatus = document.getElementById('js-incoming-status');
var incomingPanel = document.getElementById('js-incoming-panel');
var acceptBtn = document.getElementById('js-btn-accept');
var rejectBtn = document.getElementById('js-btn-reject');
var ignoreBtn = setupIgnoreBtn(document.getElementById('js-btn-ignore'));

function setAcceptBtnOnClick(invite) {
  acceptBtn.onclick = function onclick(e) {
    e.preventDefault();
    if (loggedIn) {
      acceptBtn.disabled = true;
      rejectBtn.disabled = true;
      ignoreBtn.disabled = true;
      var options = {};
      if (previewStream && previewStream.mediaStream.clone) {
        options['stream'] = previewStream.clone();
      }
      invite.accept(options)
        .done(function(conversation) {
          stopFlicker(statusImg, function() {
            acceptBtn.disabled = false;
            rejectBtn.disabled = false;
            ignoreBtn.disabled = false;
            hide(incomingPanel);
            enableDialer();
            didCall(conversation);
            callValue.value = invite.from;
            callValue.disabled = true;
          });
        }, function(error) {
          stopFlicker(statusImg, function() {
            acceptBtn.disabled = false;
            rejectBtn.disabled = false;
            ignoreBtn.disabled = false;
            hide(incomingPanel);
            enableDialer();
            console.error(error);
          });
        });
    }
  };
  return acceptBtn;
}

function setRejectBtnOnClick(invite) {
  rejectBtn.onclick = function onclick(e) {
    e.preventDefault();
    if (loggedIn) {
      acceptBtn.disabled = true;
      rejectBtn.disabled = true;
      ignoreBtn.disabled = true;
      invite.reject()
        .done(function(conversation) {
          stopFlicker(statusImg, function() {
            acceptBtn.disabled = false;
            rejectBtn.disabled = false;
            ignoreBtn.disabled = false;
            hide(incomingPanel);
            enableDialer();
          });
        }, function(error) {
          stopFlicker(statusImg, function() {
            acceptBtn.disabled = false;
            rejectBtn.disabled = false;
            ignoreBtn.disabled = false;
            hide(incomingPanel);
            enableDialer();
            console.error(error);
          });
        });
    }
  };
  return rejectBtn;
}

function setupIgnoreBtn(ignoreBtn) {
  ignoreBtn.onclick = function onclick(e) {
    e.preventDefault();
    ignoreBtn.blur();
    hide(incomingPanel);
    stopFlicker(statusImg, function() {
      incomingStatus.innerHTML = 'No one is calling you.';
      enableDialer();
    });
  };
  return ignoreBtn;
}

function incoming(invite) {
  startFlicker(statusImg);
  disableDialer();
  incomingStatus.innerHTML = '<b>' + invite.from + '</b> is calling you.';
  unhide(incomingPanel);
  setAcceptBtnOnClick(invite);
  setRejectBtnOnClick(invite);
}

function loggingOut() {
  loginBtn.disabled = true;
  var prevStatus = statusText.innerHTML;
  startFlicker(statusImg);
  statusText.innerHTML = 'Logging out&hellip;';
  hide(loginAlert);
  return function restore(error) {
    stopFlicker(statusImg, function() {
      loginBtn.disabled = false;
      statusText.innerHTML = prevStatus;
      if (error) {
        loginAlert.innerHTML = error;
        unhide(loginAlert);
      }
    });
  };
}

function logOut(callback) {
  loggedIn.unlisten().done(function() {
    callback();
  }, function(error) {
    callback(error);
  });
}

function didLogOut() {
  loggedIn = null;
  stopFlicker(statusImg, function() {
    loginBtn.innerHTML = 'Log In';
    loginBtn.className = loginBtn.className.replace(/btn-danger/, 'btn-success');
    loginBtn.disabled = false;
    loginValue.disabled = false;
    statusImg.src = 'img/twilio41x41gray.png';
    statusText.innerHTML = 'You are offline.';
  });
  disableDialer();
}

function loggingIn() {
  loginBtn.disabled = true;
  loginValue.disabled = true;
  var prevStatus = statusText.innerHTML;
  startFlicker(statusImg);
  statusText.innerHTML = 'Logging in&hellip;';
  hide(loginAlert);
  return function restore(error) {
    stopFlicker(statusImg, function() {
      loginBtn.disabled = false;
      loginValue.disabled = false;
      statusText.innerHTML = prevStatus;
      if (error) {
        loginAlert.innerHTML = error;
        unhide(loginAlert);
        console.error(loginAlert);
      }
    });
  };
}

function logIn(name, next) {
  function callback(error, config) {
    if (error) {
      return next(error);
    }
    var iceServers = getSetting('iceservers');
    if (iceServers && iceServers !== '') {
      iceServers = JSON.parse(iceServers);
    } else {
      iceServers = null;
    }
    var endpoint = new Twilio.Signal.Endpoint(getSetting('token'), {
      'debug': getDebug(),
      'eventGateway': getSetting('eventgw'),
      'iceServers': iceServers,
      'register': false,
      // 'registrarServer': 'twil.io',
      'wsServer': 'ws://' + getSetting('wsserver'),
      'inviteWithoutSdp': getInviteWithoutSDP()
    });
    endpoint.listen().done(function() {
      next(null, endpoint);
    }, function(error) {
      next(error);
    });
  }
  updateConfig(realm, name, callback);
}

function didLogIn(endpoint) {
  loggedIn = endpoint;
  var name = endpoint.address;
  stopFlicker(statusImg, function() {
    loginBtn.innerHTML = 'Log Out';
    loginBtn.className = loginBtn.className.replace(/btn-success/, 'btn-danger');
    loginBtn.disabled = false;
    statusImg.src = 'img/twilio41x41.png';
    statusText.innerHTML = 'You are online as <b>' + name + '</b>.';
    enableDialer();
    callValue.focus();
  });
}

// Call
// ====

var callInProgress = null;

var callValue = document.getElementById('js-call-value');

var dtmfBtns =
  ['1', '2', '3',
   '4', '5', '6',
   '7', '8', '9',
   'star', '0', 'pound'].map(function(dtmf) {
     var id = 'js-btn-' + dtmf;
     var dtmfBtn = document.getElementById(id);
     return setupDTMFBtn(dtmfBtn, dtmf);
   });

var callBtn = setupCallBtn(document.getElementById('js-btn-call'));
var callAlert = document.getElementById('js-call-alert');

var muteBtn = setupMuteBtn(document.getElementById('js-btn-mute'));
var muted = false;

var pauseBtn = setupPauseBtn(document.getElementById('js-btn-pause'));
var paused = false;

function enableDialer() {
  callValue.disabled = false;
  dtmfBtns.forEach(function(btn) {
    btn.disabled = false;
  });
  callBtn.disabled = false;
}

function disableDialer() {
  if (!callInProgress) {
    callValue.disabled = true;
    dtmfBtns.forEach(function(btn) {
      btn.disabled = true;
    });
    callBtn.disabled = true;
  }
}

// DTMF Buttons
// ------------

function setupDTMFBtn(dtmfBtn, dtmf) {
  dtmfBtn.onclick = function onclick(e) {
    e.preventDefault();
    dtmfBtn.blur();
    if (callInProgress) {
      // TODO: Send DTMF.
      return;
    }
    switch (dtmf) {
      case 'star':
        dtmf = '*';
        break;
      case 'pound':
        dtmf = '#';
        break;
    }
    callValue.value += dtmf;
  };
  return dtmfBtn;
}

// Mute/Pause Buttons
// ------------------

function setupMuteBtn(muteBtn) {
  muteBtn.onclick = function(e) {
    e.preventDefault();
    muteBtn.blur();
    if (!callInProgress) {
      return;
    }
    // TODO(mroberts): Rethink loggedIn...
    muted = !muted;
    if (callInProgress && callInProgress.getLocalStream()) {
      callInProgress.getLocalStream().muted = muted;
    }
    muteBtn.innerHTML = muted ? 'Unmute' : 'Mute';
  };
  return muteBtn;
}

function setupPauseBtn(pauseBtn) {
  pauseBtn.onclick = function(e) {
    e.preventDefault();
    pauseBtn.blur();
    if (!callInProgress) {
      return;
    }
    // TODO(mroberts): Rethink loggedIn...
    paused = !paused;
    if (callInProgress && callInProgress.getLocalStream()) {
      callInProgress.getLocalStream().paused = paused;
    }
    pauseBtn.innerHTML = paused ? 'Unpause' : 'Pause';
  };
  return pauseBtn;
}

// Call/Hang Up Flow
// -----------------

var cancel = null;

function setupCallBtn(callBtn) {
  callBtn.onclick = function(e) {
    e.preventDefault();
    callBtn.blur();
    var restore;
    if (cancel) {
      cancel();
      cancel = null;
      return;
    } if (callInProgress) {
      restore = hangingUp();
      // Hangup
      callInProgress.getLocalStream().stop();
      return loggedIn.leave(callInProgress)
        .done(function() {
          callInProgress = null;
          return; // didHangUp();
        }, function(error) {
          restore(error.message);
        });
    }
    restore = calling();
    // Call
    var options = {};
    if (previewStream && previewStream.mediaStream.clone) {
      options['stream'] = previewStream.clone();
    }
    loggedIn.invite(callValue.value, options)
      .done(function(conversation) {
        // FIXME(mroberts): ...
        // cancel = function cancel() {
        //   loggedIn.leave(conversation);
        //   restore();
        // };
        conversation.once('participantJoined', function(participant) {
          cancel = null;
          didCall(conversation);
        });
      }, function(error) {
        restore(error.message);
      });
  };
  return callBtn;
}

function hangingUp() {
  startFlicker(statusImg);
  callBtn.disabled = true;
  dtmfBtns.forEach(function(btn) {
    btn.disabled = true;
  });
  muteBtn.disabled = true;
  pauseBtn.disabled = true;
  hide(callAlert);
  return function restore(error) {
    callBtn.disabled = false;
    dtmfBtns.forEach(function(btn) {
      btn.disabled = false;
    });
    muteBtn.disabled = false;
    pauseBtn.disabled = false;
    if (error) {
      callAlert.innerHTML = error;
      unhide(callAlert);
    }
  };
}

function didHangUp() {
  callInProgress = null;
  stopDisplayingConversation(callInProgress);
  stopFlicker(statusImg, function() {
    callValue.disabled = false;
    callBtn.innerHTML = 'Call';
    callBtn.className = callBtn.className.replace(/btn-danger/, 'btn-success');
    callBtn.disabled = false;
    dtmfBtns.forEach(function(btn) {
      btn.disabled = false;
    });
    // TODO: Unmute/unpause
    muted = false;
    paused = false;
    muteBtn.innerHTML = 'Mute';
    pauseBtn.innerHTML = 'Pause';
    if (!loggedIn) {
      disableDialer();
    } else {
      callValue.focus();
    }
  });
}

function calling() {
  startFlicker(statusImg);
  callValue.disabled = true;
  // callBtn.disabled = true;
  callBtn.className = callBtn.className.replace(/btn-success/, 'btn-danger');
  callBtn.innerHTML = 'Cancel';
  dtmfBtns.forEach(function(btn) {
    btn.disabled = true;
  });
  hide(callAlert);
  return function restore(error) {
    stopFlicker(statusImg, function() {
      callValue.disabled = false;
      // callBtn.disabled = false;
      callBtn.className = callBtn.className.replace(/btn-danger/, 'btn-success');
      callBtn.innerHTML = 'Call';
      dtmfBtns.forEach(function(btn) {
        btn.disabled = false;
      });
      if (error) {
        callAlert.innerHTML = error;
        unhide(callAlert);
      }
    });
  };
}

function didCall(conversation) {
  callInProgress = conversation;
  startDisplayingConversation(conversation);
  stopFlicker(statusImg, function() {
    callBtn.innerHTML = 'Hang Up';
    callBtn.className = callBtn.className.replace(/btn-success/, 'btn-danger');
    callBtn.disabled = false;
    dtmfBtns.forEach(function(btn) {
      btn.disabled = false;
    });
    muteBtn.disabled = false;
    pauseBtn.disabled = false;
  });
  conversation.once('participantLeft', function(participant) {
    if (loggedIn) {
      conversation.getLocalStream().stop();
      loggedIn.leave(conversation);
    }
    didHangUp();
  });
}

// Conversation Display
// ---------------

var center = document.getElementById('js-center');
var videoDiv = null;
var remoteVideos = null;
var localVideo = null;

function startDisplayingConversation(conversation) {
  var remoteVideoDiv = document.createElement('div');
  remoteVideoDiv.className += ' js-remote-video-div';
  var remoteStreams = conversation.getRemoteStreams();
  remoteVideos = remoteStreams.map(function(remoteStream) {
    var remoteVideo = remoteStream.attach();
    remoteVideo.className += ' js-remote-video';
    remoteVideoDiv.appendChild(remoteVideo);
    return remoteVideo;
  });

  var localVideoDiv = document.createElement('div');
  localVideoDiv.className += ' js-local-video-div';
  var localStream = conversation.getLocalStream();
  var localVideo = localStream.attach();
  localVideo.className += ' js-local-video';
  localVideoDiv.appendChild(localVideo);

  videoDiv = document.createElement('div');
  videoDiv.className += ' js-video-div';
  videoDiv.appendChild(remoteVideoDiv);
  videoDiv.appendChild(localVideoDiv);

  center.appendChild(videoDiv);
}

function stopDisplayingConversation() {
  remoteVideos.forEach(function(remoteVideo) {
    remoteVideo.pause();
  });
  remoteVideos = null;
  if (localVideo) {
    localVideo.pause();
    localVideo = null;
  }
  center.removeChild(videoDiv);
  videoDiv = null;
}

// Utilities
// ---------

function stopFlicker(element, callback) {
  var event;
  function stop() {
    element.removeEventListener(event, stop);
    element.className = element.className.replace(/animate-flicker/, '');
    callback();
  }
  if (element.className.match(/ animate-flicker/)) {
    var animationEvents = {
      animation: 'animationiteration',
      OAnimation: 'oAnimationIteration',
      MozAnimation: 'animationiteration',
      WebkitAnimation: 'webkitAnimationIteration'
    };
    for (var name in animationEvents) {
      if (element.style[name] !== undefined) {
        event = animationEvents[name];
        element.addEventListener(event, stop);
        break;
      }
    }
  } else {
    callback();
  }
}

function startFlicker(element) {
  if (!element.className.match(/ animate-flicker/)) {
    element.className += ' animate-flicker';
  }
}

function flipPanel(element, callback) {
  var event;
  function next() {
    hide(element);
    element.removeEventListener(event, next);
    element.className = element.className.replace(/animate-flip/, '');
    if (callback) {
      callback();
    }
  }
  if (!element.className.match(/ animate-flip/)) {
    element.className += ' animate-flip';
    var animationEvents = {
      animation: 'animationend',
      OAnimation: 'oAnimationEnd',
      MozAnimation: 'animationend',
      WebkitAnimation: 'webkitAnimationEnd'
    };
    for (var name in animationEvents) {
      if (element.style[name] !== undefined) {
        event = animationEvents[name];
        element.addEventListener(event, next);
        break;
      }
    }
  } else if (callback) {
    callback();
  }
}

function unflipPanel(element, callback) {
  var event;
  function next() {
    element.removeEventListener(event, next);
    element.className = element.className.replace(/animate-unflip/, '');
    if (callback) {
      callback();
    }
  }
  if (!element.className.match(/ animate-unflip/)) {
    unhide(element);
    element.className += ' animate-unflip';
    var animationEvents = {
      animation: 'animationend',
      OAnimation: 'oAnimationEnd',
      MozAnimation: 'animationend',
      WebkitAnimation: 'webkitAnimationEnd'
    };
    for (var name in animationEvents) {
      if (element.style[name] !== undefined) {
        event = animationEvents[name];
        element.addEventListener(event, next);
        break;
      }
    }
  } else if (callback) {
    callback();
  }
}

function unhide(element) {
  element.className = element.className.replace(/hidden/, '');
  checkScrollbarVisible();
}

function hide(element) {
  if (!element.className.match(/hidden/)) {
    element.className += ' hidden';
  }
  checkScrollbarVisible();
}

// Settings
// ========

var mainPanel = document.getElementById('js-main-panel');
var settingsBtn = document.getElementById('js-settings');
var settingsPanel = document.getElementById('js-settings-panel');
var settingsBackBtn = document.getElementById('js-back');

settingsBtn.onclick = function() {
  flipPanel(mainPanel, function() {
    unflipPanel(settingsPanel);
  });
};

settingsBackBtn.onclick = function() {
  flipPanel(settingsPanel, function() {
    unflipPanel(mainPanel);
  });
};

function getStats(onSuccess, onFailure) {
  if (!callInProgress) {
    return onFailure(new Error('No call in progress!'));
  }
  callInProgress.getStats().then(onSuccess, onFailure);
}

function checkScrollbarVisible() {
  var leftPanelWrapper = document.getElementById('left-panel-wrapper');
  var scrollbarVisible = leftPanelWrapper.clientHeight < leftPanelWrapper.scrollHeight;
  if (scrollbarVisible) {
    if (!center.className.match(/scrollbar-visible/)) {
      center.className += ' scrollbar-visible';
    }
  } else {
    center.className = center.className.replace(/scrollbar-visible/, '');
  }
}

window.onresize = checkScrollbarVisible;

checkScrollbarVisible();

// Settings
// ========

var defaultSettings = {};
var settings = {};

var editableSettings = [
  'wsserver',
  'eventgw',
  'token',
  'iceservers',
  'conversations-service'
];

editableSettings.forEach(function(editableSetting) {
  var formGroupId = '#js-' + editableSetting + '-form-group';
  var input = document.querySelectorAll(formGroupId + ' input')[0];
  var button = document.querySelectorAll(formGroupId + ' .btn')[0];
  var icon = document.querySelectorAll(formGroupId + ' .btn span')[0];
  button.onclick = function onclick(e) {
    e.preventDefault();
    button.blur();
    if (input.disabled) {
      input.disabled = false;
      input.value = settings[editableSetting] = defaultSettings[editableSetting];
      icon.classList.add('glyphicon-remove');
      icon.classList.remove('glyphicon-pencil');
    } else {
      input.disabled = true;
      input.value = defaultSettings[editableSetting];
      delete settings[editableSetting];
      icon.classList.add('glyphicon-pencil');
      icon.classList.remove('glyphicon-remove');
    }
  };
  input.onchange = function onchange(e) {
    e.preventDefault();
    settings[editableSetting] = input.value;
  };
  defaultSettings[editableSetting] = null;
});

function getSetting(setting) {
  return setting in settings ? settings[setting] : defaultSettings[setting];
}

var inviteWithoutSDP = false;

function getInviteWithoutSDP() {
  return inviteWithoutSDP;
}

function setInviteWithoutSDP(_inviteWithoutSDP) {
  inviteWithoutSDP = _inviteWithoutSDP;
}

var inviteWithoutSDPToggle = document.getElementById('js-invite-without-sdp-setting');
inviteWithoutSDPToggle.onchange = function onchange(e) {
  setInviteWithoutSDP(!getInviteWithoutSDP());
}

var debug = true;

function getDebug() {
  return debug;
}

function setDebug(_debug) {
  debug = _debug;
}

var debugToggle = document.getElementById('js-debug-setting');
debugToggle.onchange = function onchange(e) {
  setDebug(!getDebug());
}

function setupRealmBtns(realmBtns) {
  var realms = ['dev', 'stage', 'prod'];
  [].forEach.call(realmBtns, function(realmBtn, i) {
    realmBtn.onclick = function onclick(e) {
      e.preventDefault();
      realmBtn.blur();
      console.log(realms[i]);
      setRealm[realms[i]];
      updateConfig(realms[i]);
    };
  });
  return realmBtns;
}

var realmBtns = setupRealmBtns(document.querySelectorAll('.realms .btn'));

function setRealm(_realm) {
  console.log(_realm);
  realm = _realm;
  [].forEach.call(realmBtns, function(realmBtn) {
    realmBtn.classList.remove('active');
  });
  var realmInputs = document.querySelectorAll('.realms input');
  [].forEach.call(realmInputs, function(realmInput) {
    realmInput.checked = false;
  });
  var realmIndex;
  switch (realm) {
    case 'dev':
      realmIndex = 0;
      break;
    case 'stage':
      realmIndex = 1;
      break;
    case 'prod':
      realmIndex = 2;
      break;
  }
  realmBtns[realmIndex].classList.add('active');
  realmInputs[realmIndex].checked = true;
}

function setDefaultSetting(editableSetting, value) {
  defaultSettings[editableSetting] = value;
  var formGroupId = '#js-' + editableSetting + '-form-group';
  var input = document.querySelectorAll(formGroupId + ' input')[0];
  if (input.disabled) {
    input.value = value;
  }
}

function getConfig(realm, name, next) {
  var xhr = new XMLHttpRequest();
  var configUrl = 'config';
  var configParams = [];
  if (realm) {
    configParams.push('realm=' + realm);
  }
  if (name) {
    name = encodeURIComponent(name);
    configParams.push('name=' + name);
  }
  configUrl += '?' + configParams.join('&');
  xhr.open('GET', configUrl, true);
  xhr.ontimeout = function ontimeout() {
    next('Timed-out getting config from server.');
  };
  xhr.onreadystatechange = function onreadystatechange() {
    if (xhr.readyState === 4) {
      switch (xhr.status) {
        case 200:
          try {
            var config = JSON.parse(xhr.responseText);
            next(null, config);
          } catch (e) {
            next(e.message);
            throw e;
          }
          break;
        default:
          next('Getting config from the server failed with "'
                 + xhr.status + ' ' + xhr.statusText + '"');
      }
    }
  };
  xhr.send();
}

function withConfig(error, config, next) {
  if (error) {
    if (next) {
      next(error);
    }
    return;
  }
  setRealm(config['realm']);
  setDefaultSetting('wsserver', config['ws_server']);
  setDefaultSetting('eventgw', config['event_gateway']);
  if (config['ice_servers']) {
    setDefaultSetting('iceservers', config['ice_servers']);
  } else {
    setDefaultSetting('iceservers', '');
  }
  if (config['capability_token']) {
    setDefaultSetting('token', config['capability_token']);
  } else {
    setDefaultSetting('token', '');
  }
  if (next) {
    next(error, config);
  }
};

function updateConfig(realm, name, next) {
  var callback;
  if (!next) {
    callback = withConfig;
  } else {
    callback = function callback(error, config) {
      withConfig(error, config, next);
    };
  }
  getConfig(realm, name, callback);
}

updateConfig(realm);
