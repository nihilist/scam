const sel = (selector) => document.querySelector(selector);
const getSession = (username) => JSON.parse(localStorage.getItem('sc-accounts'))[username];
const getCurrentUser = () => {
  if (sel('.header__userNavUsernameButton') !== null) {
    return sel('.header__userNavUsernameButton').href.replace('https://soundcloud.com/', '');
  }

  return false;
};

const saveSession = (username, cookie) => {
  const obj = localStorage.hasOwnProperty('sc-accounts') ? JSON.parse(localStorage.getItem('sc-accounts')) : {};
  const storedCookie = Object.keys(obj).find((user) => obj[user] === cookie);
  if (storedCookie && username !== storedCookie) delete obj[storedCookie];
  obj[username] = cookie;
  localStorage.setItem('sc-accounts', JSON.stringify(obj));
};

const deleteSession = (username) => {
  if (localStorage.hasOwnProperty('sc-accounts')) {
    const obj = JSON.parse(localStorage.getItem('sc-accounts'));
    delete obj[username];
    localStorage.setItem('sc-accounts', JSON.stringify(obj));
  }
};

const saveCurrentSession = () => {
  const username = getCurrentUser();
  chrome.runtime.sendMessage({ method: 'getCookie', data: { name: 'oauth_token' } }, (data) => {
    const cookie = data ? data.value : null;
    if (username && cookie) saveSession(username, cookie);
  });
};

const switchSession = (user) => {
  saveCurrentSession();
  chrome.runtime.sendMessage({ method: 'setCookie', data: { name: 'oauth_token', value: getSession(user) } }, () => {
    location.reload();
  });
};

const forceLogout = () => {
  saveCurrentSession();
  chrome.runtime.sendMessage({ method: 'removeCookie', data: { name: 'oauth_token' } }, () => {
    chrome.runtime.sendMessage({ method: 'forceLogout' }, () => {
      window.location = 'https://soundcloud.com/signin';
    });
  });
};

const injectSwitcher = () => {
  if (localStorage.hasOwnProperty('sc-accounts')) {
    const accounts = JSON.parse(localStorage.getItem('sc-accounts'));
    const list = document.createElement('ul');
    list.setAttribute('class', 'profileMenu__list sc-list-nostyle');

    const addBtn = document.createElement('li');
    addBtn.setAttribute('class', 'profileMenu__item');
    const addLink = document.createElement('a');
    addLink.setAttribute('class', 'profileMenu__link profileMenu__friends');
    addLink.innerText = 'Add Account';
    addLink.id = 'add-account';
    addLink.href = '#';


    addBtn.onclick = () => {
      forceLogout();
    };

    addBtn.appendChild(addLink);
    list.appendChild(addBtn);

    Object.keys(accounts).forEach((account) => {
      if (account === getCurrentUser()) return;

      const wrapper = document.createElement('div');
      const li = document.createElement('li');
      const link = document.createElement('a');

      li.setAttribute('class', 'profileMenu__item');
      link.setAttribute('class', 'profileMenu__link profileMenu__profile');
      link.innerText = account;
      link.id = 'switch-account';
      link.dataset.user = account;
      link.href = '#';
      link.title = account;
      link.style.display = 'inline-block';
      link.style.width = '50%';
      link.style.textOverflow = 'ellipsis';
      link.style.overflow = 'hidden';
      link.style.verticalAlign = 'middle';


      const delBtn = document.createElement('a');

      delBtn.setAttribute('class', 'profileMenu__profile');
      delBtn.innerHTML = '&times;';
      delBtn.id = 'delete-account';
      delBtn.dataset.user = account;
      delBtn.href = '#';
      delBtn.style.padding = '5px';
      delBtn.style.display = 'inline-block';
      delBtn.style.verticalAlign = 'middle';

      delBtn.onclick = (event) => {
        if (confirm(`Are you sure you want to remove the '${event.target.dataset.user}' account?`)) { // eslint-disable-line
          deleteSession(event.target.dataset.user);
          event.target.parentNode.parentNode.removeChild(event.target.parentNode);
        }
      };

      link.onclick = (event) => {
        switchSession(event.target.dataset.user);
      };

      wrapper.appendChild(link);
      wrapper.appendChild(delBtn);
      li.appendChild(wrapper);
      list.appendChild(li);
    });
    sel('.profileMenu').appendChild(list);
  }
};

const injectLoggedOutSwitcher = () => {
  if (localStorage.hasOwnProperty('sc-accounts')) {
    const publicSignIn = sel('.modal__modal .signinInitialStep__socialButtons');
    const accounts = JSON.parse(localStorage.getItem('sc-accounts'));
    const scamBtn = document.createElement('button');
    const accountSelector = document.createElement('select');
    scamBtn.setAttribute('class', 'signinForm__cta sc-button sc-button-large');
    accountSelector.setAttribute('class', 'signinForm__cta sc-button sc-button-large');
    scamBtn.innerText = 'Saved accounts';
    publicSignIn.appendChild(scamBtn);
    const firstOption = document.createElement('option');
    firstOption.innerText = 'Accounts';
    firstOption.disabled = 'true';
    firstOption.selected = 'true';
    accountSelector.appendChild(firstOption);
    Object.keys(accounts).forEach((accountName) => {
      const accountEl = document.createElement('option');
      accountEl.value = accountName;
      accountEl.innerText = accountName;
      accountSelector.appendChild(accountEl);
    });

    scamBtn.onclick = () => {
      scamBtn.parentNode.replaceChild(accountSelector, scamBtn);
    };

    accountSelector.onchange = () => {
      switchSession(accountSelector.value);
    };
  }
};

const menuObserver = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    const addedNodes = Array.from(mutation.addedNodes);
    if (addedNodes.includes(sel('.dropdownMenu')) || addedNodes.includes(sel('.profileMenu__list'))) {
      injectSwitcher();
    } else if (addedNodes.includes(sel('.modal__modal .signinForm'))) {
      injectLoggedOutSwitcher();
    }
  }
});

const init = () => {
  const observerOptions = { childList: true, subtree: true };
  menuObserver.observe(document.body, observerOptions);
  saveCurrentSession();
};

init();
