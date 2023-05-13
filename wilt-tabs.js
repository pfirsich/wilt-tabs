// This is the default configuration
let config = {
    wiltDuration: {
        unit: "days",
        value: 7,
    },
    bookmarkTabs: true,
    bookmarkFolder: "unfiled_____",
    createDailySubfolder: true,
    includeTabHistory: true,
}

function getWiltDurationInMillis() {
    if (config.wiltDuration.unit == "days") {
        return config.wiltDuration.value * 24 * 60 * 60 * 1000;
    } else if (config.wiltDuration.unit == "hours") {
        return config.wiltDuration.value * 60 * 60 * 1000;
    } else if (config.wiltDuration.unit == "minutes") {
        return config.wiltDuration.value * 60 * 1000;
    }
    return Number.MAX_SAFE_INTEGER;
}

function humanizeDuration(millis) {
    let secs = millis / 1000;
    let str = "";
    let days = Math.floor(secs / (24 * 60 * 60));
    if (days > 0) {
        str += days.toString() + "d";
        secs -= days * 24 * 60 * 60;
    }
    let hours = Math.floor(secs / (60 * 60));
    if (hours > 0) {
        str += hours.toString() + "h";
        secs -= hours * 60 * 60;
    }
    let minutes = Math.floor(secs / 60);
    if (minutes > 0) {
        str += minutes.toString() + "m";
        secs -= minutes * 60;
    }
    str += Math.floor(secs.toString()) + "s";
    return str;
}

function switchTab(event) {
    let a = event.target;
    let tabId = a.getAttribute("data-tab-id");
    browser.tabs.update(parseInt(tabId), { active: true });
}

function selectBookmarkFolder(event) {
    let li = event.target;

    let selected = document.querySelector("li.selected");
    if (selected) {
        selected.classList.remove("selected");
    }
    li.classList.add("selected");

    let bookmarkId = li.getAttribute("data-bookmark-id");
    config.bookmarkFolder = bookmarkId;
    browser.storage.local.set({ config: config });

    browser.bookmarks.getSubTree(bookmarkId).then((items) => {
        document.querySelector("#bookmark-folder").value = items[0].title;
    });
}

function addBookmarkFolder(root, folder) {
    let li = document.createElement("li");
    li.setAttribute("data-bookmark-id", folder.id);
    li.addEventListener("click", selectBookmarkFolder);
    if (folder.id == config.bookmarkFolder) {
        li.classList.add("selected");
    }

    let ul = document.createElement("ul");

    let title = folder.title;
    // Probably only works in Firefox. I don't care.
    if (folder.id == "root________" && title == "") {
        // Not even localized - great stuff! What else should I do?
        title = "All Bookmarks";
    }
    li.appendChild(document.createTextNode(title));
    li.appendChild(ul);

    root.appendChild(li);

    for (let child of folder.children) {
        if (child.type == "folder") {
            addBookmarkFolder(ul, child);
        }
    }
}

function clearChildren(elem) {
    while (elem.lastChild) {
        elem.removeChild(elem.lastChild);
    }
}

function openPopup() {
    browser.tabs.query({ currentWindow: true }).then((tabs) => {
        let openTabsList = document.querySelector("#open-tabs-list");
        clearChildren(openTabsList);

        let tabObjects = []

        for (let tab of tabs) {
            let li = document.createElement("li");
            let a = document.createElement("a");

            a.setAttribute("href", "#");
            a.setAttribute("data-tab-id", tab.id);
            a.textContent = tab.title;
            a.addEventListener("click", switchTab);

            let text = document.createTextNode(" - wilts in ");
            let span = document.createElement("span");
            let wiltInMillis = tab.lastAccessed + getWiltDurationInMillis() - Date.now();
            span.textContent = humanizeDuration(wiltInMillis);

            li.appendChild(a);
            li.appendChild(text);
            li.appendChild(span);

            tabObjects.push({ element: li, wiltInMillis: wiltInMillis });
        }

        tabObjects.sort((a, b) => {
            return a.wiltInMillis - b.wiltInMillis;
        });

        console.log(tabObjects);

        for (let tab of tabObjects) {
            console.log(tab);
            console.log(tab.element);
            openTabsList.appendChild(tab.element);
        }
    });

    browser.bookmarks.getTree().then((bookmarks) => {
        let tree = document.querySelector("#bookmark-folder-tree");
        clearChildren(tree);
        addBookmarkFolder(tree, bookmarks[0]);
    });
}

browser.storage.local.get("config").then((data) => {
    // TODO: I should probably revalidate data here!
    if (data.config != undefined) {
        config = data.config;
    } else {
        // Save initial config
        browser.storage.local.set({ config: config });
    }
    console.log("Config: ", config);

    document.querySelector("#duration").value = config.wiltDuration.value.toString();
    document.querySelector("#" + config.wiltDuration.unit).checked = true;

    document.querySelector("#bookmark-tabs-checkbox").checked = config.bookmarkTabs;
    browser.bookmarks.getSubTree(config.bookmarkFolder).then((items) => {
        document.querySelector("#bookmark-folder").value = items[0].title;
    });

    document.querySelector("#create-daily-subfolder-checkbox").checked = config.createDailySubfolder;
    document.querySelector("#include-history-checkbox").checked = config.includeTabHistory;
});

function setConfig() {
    if (document.querySelector("#minutes").checked) {
        config.wiltDuration.unit = "minutes";
    } else if (document.querySelector("#hours").checked) {
        config.wiltDuration.unit = "hours";
    } else if (document.querySelector("#days").checked) {
        config.wiltDuration.unit = "days";
    }
    config.wiltDuration.value = parseInt(document.querySelector("#duration").value);
    config.bookmarkTabs = document.querySelector("#bookmark-tabs-checkbox").checked;
    // config.bookmarkFolder handled through selectBookmarkFolder
    config.createDailySubfolder = document.querySelector("#create-daily-subfolder-checkbox").checked;
    config.includeTabHistory = document.querySelector("#include-history-checkbox").checked;
    browser.storage.local.set({ config: config });
}

// Dude, I don't know how to do this properly
document.querySelector("#duration").addEventListener("change", setConfig);
document.querySelector("#minutes").addEventListener("change", setConfig);
document.querySelector("#hours").addEventListener("change", setConfig);
document.querySelector("#days").addEventListener("change", setConfig);
document.querySelector("#bookmark-tabs-checkbox").addEventListener("change", setConfig);
document.querySelector("#create-daily-subfolder-checkbox").addEventListener("change", setConfig);
document.querySelector("#include-history-checkbox").addEventListener("change", setConfig);

document.addEventListener("DOMContentLoaded", openPopup);
