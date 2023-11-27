// ------------------------------------------ Functions --------------------------

function listTabs(tabs){
  // get list template from popup.html
  const template = document.getElementById('li_template');
  // create new set of elements (tabs) that will be shown in the window
  const elements = new Set();

  tabs = sortTabs(Array.from(tabs));

  for (const tab of tabs) {
    // clones the node of the template
    const element = template.content.firstElementChild.cloneNode(true);
    // add title, url, goto to the element
    const title = tab.title.split('-')[0].trim();
    const url = new URL(tab.url).hostname;
    let group = "None";
    let color = "None";
    if(tab.groupId != -1) {
      const groupOfTab = findGroupOfTab(tab);
      group = groupOfTab.title;
      color = groupOfTab.color;
    }
    element.querySelector('.tabgroup').style.borderLeft = "10px solid"+ colors[color];
    element.querySelector('.title').textContent = title;
    element.querySelector('.url').textContent = url;
    element.querySelector('.group').textContent = group;
    element.querySelector('.goto').addEventListener('click', () => {
      openTab(tab.id, tab.windowId)
    });
    element.querySelector('.check').addEventListener('change', () => {
      tabManager(element.querySelector('.check').checked, tab);
    });
    
    elements.add(element);
  }

  document.querySelector('tbody').replaceChildren(...elements);
}

async function tabManager(check ,tab){
  if(check){
    selectedTabs.add(tab);
  } else {
    selectedTabs.delete(tab);
  }
}

async function createTabGroup(tabs, groupName){
  const tabIds = tabs.map(({ id }) => id);
  if (tabIds.length) {
    const group = await chrome.tabs.group({ tabIds });
    await chrome.tabGroups.update(group, { title: groupName });
  }
}

async function openTab(tabId, windowId) {
  await chrome.tabs.update(tabId, { active: true });
  await chrome.windows.update(windowId, { focused: true });
}

function setCheckboxes(checked){
  document.querySelectorAll('.check').forEach(function(checkbox){
    checkbox.checked = checked;
  });
}

function filterTabs(filter){
  console.log(filter)
  searchTabs = new Set()
  const specificedFilter = filter.split(":");
  let filteredTabs = new Set();
  console.log(specificedFilter)
  if (specificedFilter.length > 1){
    for (let i = 0; i < specificedFilter.length; i = i+2){
      if(specificedFilter[i] == "url") {
        filteredTabs = new Set([...filteredTabs, ...findTabs(foundTabs, "url", specificedFilter[i+1])]);
      } else if(specificedFilter[i] == "name" || specificedFilter[i] == "title") {
        filteredTabs = new Set([...filteredTabs, ...findTabs(foundTabs, "title", specificedFilter[i+1])]);
      }
    }
  } else {
    console.log("na");
    filteredTabs = new Set([...findTabs(foundTabs, "url", filter), ...findTabs(foundTabs, "title", filter)])
  }
  
  filteredTabs.forEach((tab) => {
    searchTabs.add(tab)
  });
  listTabs(searchTabs)
}

function findTabs(tabs, property, query) {
  return tabs.filter(tab => tab[property].toLowerCase().includes(query));
}

function sortTabs(tabs) {
  tabs = tabs.sort((a, b) => collator.compare(a.title, b.title));
  let sortedTabs = new Set()
  switch (sortMode) {
    case "name":
      sortedTabs = tabs.sort((a, b) => (orderAsc ? 1 : -1) * collator.compare(a.title, b.title));
      break;
    case "group":
      let groups = foundTabGroups.sort((a, b) => (orderAsc ? 1 : -1) * collator.compare(a.title, b.title));
      groups.forEach((group) => {
        let groupTabs = tabs.filter(tab => tab.groupId === group.id);
        if(groupTabs){
          sortedTabs = new Set([...sortedTabs, ...groupTabs]);
        }
      });
      let groupTabs = tabs.filter(tab => tab.groupId === -1); 
      sortedTabs = new Set([...sortedTabs, ...groupTabs]);
      break;
    case "url":
      sortedTabs = tabs.sort((a, b) => (orderAsc ? 1 : -1) * collator.compare(new URL(a.url).hostname, new URL(b.url).hostname));
      break;
    default:
      return tabs;
  }
  return sortedTabs;
}

function findGroupOfTab(tab){
  if(tab.groupId != -1) {
    return foundTabGroups.find(tabGroup => tabGroup.id === tab.groupId)
  } else {
    return -1
  }
}

function findTabsOfGroup(tabGroup){
  return foundTabs.filter(tab => tab.groupId === tabGroup.id)
}

function handleSort(element, mode) {
  orderAsc = !orderAsc;
  for(const key in sorts) {
    const elementId = `sort${key.charAt(0).toUpperCase() + key.slice(1)}`;
    console.log(elementId);
    document.getElementById(elementId).innerHTML = sorts[key];
  }
  element.innerHTML = orderAsc ? `${sorts[mode]} &#11033;` : `${sorts[mode]} &#11032;`;
  sortMode = mode;
  listTabs(foundTabs);
  }

// ------------------------------------------ Events --------------------------
document.getElementById('group').addEventListener('click', async () => {
  const groupName = document.getElementById('groupName').value;
  console.log(groupName);
  createTabGroup([...selectedTabs], groupName)
});

document.getElementById('selection').addEventListener('click', async () => {
  selection = !selection;
  searchTabs.forEach((tab) => {
    if(selection){
    selectedTabs.add(tab);
    } else {
    selectedTabs.delete(tab);
    }
  });
  let buttonMessage = !selection ? "Select" : "Unselect";
  document.getElementById('selection').innerHTML = buttonMessage;
  setCheckboxes(selection);
});

document.getElementById('filter').addEventListener('change', function() {
  filterTabs(this.value);
});

document.getElementById('sortName').addEventListener('click', function() {
  handleSort(this, "name");
});

document.getElementById('sortUrl').addEventListener('click', function() {
  handleSort(this, "url");
});

document.getElementById('sortGroup').addEventListener('click', function() {
  handleSort(this, "group");
});


// ------------------------------------------ Constants and Main Action --------------------------
// get all Tabs that have an http* Link in the url
const foundTabs = await chrome.tabs.query({
  url: [
    "http://*/*",
    "https://*/*"
  ]
});
const foundTabGroups = await chrome.tabGroups.query({
  title:"*"
});
const colors = {
  "grey" : "#DADCE0",
  "blue" : "#8AB4F8",
  "red" : "#F28B82",
  "yellow" : "#FDD663",
  "green" : "#81C995",
  "pink" : "#FF8BCB",
  "purple" : "#C58AF9",
  "cyan" : "#78D9EC",
  "orange" : "#FCAD70"
}
const sorts = {
  "name" : "Title",
  "url" : "URL",
  "group" : "TabGroup"
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Collator
const collator = new Intl.Collator();
let sortMode = "name";

let selectedTabs = new Set();
let searchTabs = foundTabs;
let selection = false;
let orderAsc = true;
listTabs(foundTabs);