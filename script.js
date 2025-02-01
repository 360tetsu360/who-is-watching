const twitch_gql_url = "https://gql.twitch.tv/gql";
const client_id = "kimne78kx3ncx6brgo4mv6wki5h1ko";
const headers = {
    'Client-Id': client_id,
    'Content-Type': 'application/json'
};

async function twitch_gql_request(payload) {
    try {
        const response = await fetch(twitch_gql_url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        return data; 
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

async function twitch_get_channel_status(login) {
    const payload = [
        {
            "operationName": "UseLive",
            "variables": {
                "channelLogin": login
            },
            "extensions": {
                "persistedQuery": {
                    "version": 1,
                    "sha256Hash": "639d5f11bfb8bf3053b424d9ef650d04c4ebb7d94711d644afb08fe9a0fad5d9"
                }
            }
        },
        {
            "operationName": "UseLiveBroadcast",
            "variables": {
                "channelLogin": login
            },
            "extensions": {
                "persistedQuery": {
                    "version": 1,
                    "sha256Hash": "0b47cc6d8c182acd2e78b81c8ba5414a5a38057f2089b1bbcfa6046aae248bd2"
                }
            }
        },
        {
            "operationName": "ChannelShell",
            "variables": {
                "login": login
            },
            "extensions": {
                "persistedQuery": {
                    "version": 1,
                    "sha256Hash": "580ab410bcd0c1ad194224957ae2241e5d252b2c5173d8e0cce9d32d5bb14efe"
                }
            }
        },
        {
            "operationName": "ChannelRoot_AboutPanel",
            "variables": {
                "channelLogin": login,
                "includeIsDJ": false,
                "skipSchedule": true,
            },
            "extensions": {
                "persistedQuery": {
                    "version": 1,
                    "sha256Hash": "0df42c4d26990ec1216d0b815c92cc4a4a806e25b352b66ac1dd91d5a1d59b80"
                }
            }
        },
    ];

    const result = await twitch_gql_request(payload);
    if (!result) {
        console.log("Request failed");
        return null;
    }

    if (result.length != 4) {
        console.log("Response is broken");
        return null;
    }

    if (!result[0].data) {
        return null;
    }

    try {
        const is_streaming = result[0].data.user.stream;
        const broadcast_status = result[1].data.user.lastBroadcast;
        const stream_created_at = is_streaming == null ? "" : is_streaming.createdAt;
        const last_broadcast_title = broadcast_status.title;
        const last_broadcast_game = broadcast_status.game.displayName;
        const display_name = result[2].data.userOrError.displayName;
        const viewer = is_streaming == null ? 0 : result[2].data.userOrError.stream.viewersCount;
        const follower = result[3].data.user.followers.totalCount;
        const profile_image_url = result[3].data.user.profileImageURL;
        const primary_color_hex = result[3].data.user.primaryColorHex;
        
        return {
            is_streaming: is_streaming != null,
            stream_created_at: stream_created_at,
            last_broadcast_title: last_broadcast_title,
            last_broadcast_game: last_broadcast_game,
            display_name: display_name,
            profile_image_url: profile_image_url,
            viewer: viewer,
            follower: follower,
            primary_color_hex: primary_color_hex
        };
    }
    catch {
        return null;
    }
}

async function twitch_get_community(login) {
    const payload = {
        "operationName": "CommunityTab",
        "variables": {
            "login": login
        },
        "extensions": {
            "persistedQuery": {
                "version": 1,
                "sha256Hash": "2e71a3399875770c1e5d81a9774d9803129c44cf8f6bad64973aa0d239a88caf"
            }
        }
    };

    const result = await twitch_gql_request(payload);
    if (!result) {
        console.log("Request failed");
        return null;
    }

    return result.data?.user?.channel?.chatters ?? null;
}

const color_theme_toggle = document.getElementById("color_theme_toggle");
const color_theme_img = document.getElementById("color_theme_img");
const search_button_img = document.getElementById("search_button_img");
const reset_button_img = document.getElementById("reset_button_img");
const github_icon_img = document.getElementById("github-icon-img");
const target_channel_id_input = document.getElementById("target_channel_id_input");
const update_target_channel = document.getElementById("update_target_channel");
const search_result = document.getElementById("search-result");
const target_channel_link = document.getElementById("target_channel_url");
const target_channel_profile_image = document.getElementById("target_channel_profile_image");
const target_channel_display_name = document.getElementById("target_channel_display_name");
const target_channel_streaming = document.getElementById("target_channel_streaming");
const target_channel_last_title = document.getElementById("target_channel_last_title");
const target_channel_last_game = document.getElementById("target_channel_last_game");
const watching_streamer_list = document.getElementById("watching_streamer_list");
const list_container = document.getElementById("list-container");
const check_mode = document.getElementById("check_mode");
const check_vip = document.getElementById("check_vip");
const check_staff = document.getElementById("check_staff");
const check_viewer = document.getElementById("check_viewer");
const tweet_button = document.getElementById("tweet-button");
const loader = document.getElementById("loader");
set_initial_theme();
color_theme_toggle.onclick = toggle_theme;

var twitch_channels = [];
fetch('twitch_channels.json')
    .then(response => response.json())
    .then(data => twitch_channels = data)
    .catch(error => console.error('Error loading JSON:', error));
update_target_channel.onclick = updateTarget;
target_channel_id_input.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        updateTarget();
    }
});
tweet_button.onclick = postToX;
var current_loop = null;
var current_login = null;

const params = new URLSearchParams(window.location.search);
if (params.has("id")) {
    const id = params.get("id");
    target_channel_id_input.value = id;
    updateTarget();
}

function set_initial_theme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        color_theme_img.src = savedTheme == "dark" ? "image/sun.svg" : "image/moon.svg";
        search_button_img.src = savedTheme == "dark" ? "image/search2.svg" : "image/search1.svg";
        reset_button_img.src = savedTheme == "dark" ? "image/reload2.svg" : "image/reload1.svg";
        github_icon_img.src = savedTheme == "dark" ? "image/github-mark-white.svg" : "image/github-mark.svg";
        target_channel_profile_image.src = savedTheme == "dark" ? "image/question1.svg" : "image/question2.svg";
    } else {
        const prefersDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDarkMode ? 'dark' : 'light');
        color_theme_img.src = prefersDarkMode ? "image/sun.svg" : "image/moon.svg";
        search_button_img.src = prefersDarkMode ? "image/search2.svg" : "image/search1.svg";
        reset_button_img.src = prefersDarkMode ? "image/reload2.svg" : "image/reload1.svg";
        github_icon_img.src = prefersDarkMode ? "image/github-mark-white.svg" : "image/github-mark.svg";
        target_channel_profile_image.src = prefersDarkMode ? "image/question1.svg" : "image/question2.svg";
    }
}

function toggle_theme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    color_theme_img.src = newTheme == "dark" ? "image/sun.svg" : "image/moon.svg";
    search_button_img.src = newTheme == "dark" ? "image/search2.svg" : "image/search1.svg";
    reset_button_img.src = newTheme == "dark" ? "image/reload2.svg" : "image/reload1.svg";
    github_icon_img.src = newTheme == "dark" ? "image/github-mark-white.svg" : "image/github-mark.svg";
    if (!current_loop) {
        target_channel_profile_image.src = newTheme == "dark" ? "image/question1.svg" : "image/question2.svg";
    }
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
}

function find_streamer(text) {
    for (channel of twitch_channels) {
        if (channel.twitch_id === text || channel.display_name === text) {
            return channel.twitch_id;
        }
    }

    return text;
}

function updateTarget() {
    const target_id = find_streamer(target_channel_id_input.value);
    twitch_get_channel_status(target_id).then(
        (channel_status) => {
            if (channel_status == null) {
                listed_channels = [];
                watching_streamer_list.innerHTML = "";
                if (current_loop) {
                    clearInterval(current_loop);
                }
                const currentTheme = document.documentElement.getAttribute('data-theme');
                target_channel_profile_image.src = currentTheme == "dark" ? "image/question1.svg" : "image/question2.svg";
                target_channel_display_name.innerText = "Streamer Name";
                target_channel_last_title.innerText = "Stream Title";
                target_channel_last_game.innerText = "Game Name";
                search_result.style.borderColor = "var(--primary-color)";
                list_container.style.borderColor = "var(--primary-color)";
                target_channel_streaming.style.display = "none"
                target_channel_link.href = "#";
                loader.style.display = "none";
                return;
            }
            target_channel_link.href = `https://www.twitch.tv/${target_id}`;
            target_channel_profile_image.src = channel_status.profile_image_url;
            target_channel_display_name.innerText = channel_status.display_name;
            target_channel_last_title.innerText = channel_status.last_broadcast_title;
            target_channel_last_game.innerText = channel_status.last_broadcast_game;
            search_result.style.borderColor = `#${channel_status.primary_color_hex}`;
            list_container.style.borderColor = `#${channel_status.primary_color_hex}`;
            if (channel_status.is_streaming) {
                target_channel_streaming.style.display = "block"
            } else {
                target_channel_streaming.style.display = "none"
            }
            loader.style.display = "block";
            listed_channels = [];
            watching_streamer_list.innerHTML = "";

            if (current_loop) {
                clearInterval(current_loop);
            }

            current_login = target_id;
            current_loop = setInterval(async () => {
                await check_watching_streamer(target_id);
            }, 500);
        }
    );
}

async function add_list(login) {
    const streamer_status = await twitch_get_channel_status(login);
    const image_elem = document.createElement("img");
    image_elem.className = "item-image";
    image_elem.src = streamer_status.profile_image_url;
    const overlay = document.createElement("div");
    overlay.className = "profile-overlay";
    overlay.style.display = streamer_status.is_streaming ? "block" : "none";
    const image_container = document.createElement("div");
    image_container.className = "image-container";
    image_container.appendChild(image_elem);
    image_container.appendChild(overlay);
    const name_elem = document.createElement("div");
    name_elem.className = "item-name";
    name_elem.textContent = `${streamer_status.display_name} (${login})`;
    const details = document.createElement("div");
    details.className = "item-details";
    details.appendChild(name_elem);
    const list_item = document.createElement("div");
    list_item.className = "list-item"
    list_item.appendChild(image_container);
    list_item.appendChild(details);
    const link = document.createElement("a");
    link.href = `https://www.twitch.tv/${login}`;
    link.appendChild(list_item);
    link.target = "_blank";
    const entry = document.createElement('li');
    entry.appendChild(link);
    watching_streamer_list.appendChild(entry);
    postToX();
}

var listed_channels = [];
async function check_watching_streamer(login) {
    const community = await twitch_get_community(login);

    if (!community) {
        return;
    }

    if (login != current_login) {
        return;
    }
    
    if (check_mode.checked) {
        for (const mode of community.moderators) {
            for (const channel of twitch_channels) {
                if (listed_channels.includes(channel.twitch_id)) {
                    continue;
                }
                if (mode.login == channel.twitch_id) {
                    listed_channels.push(channel.twitch_id);
                    await add_list(channel.twitch_id);
                }
            }
        }
    }

    if (check_vip.checked) {
        for (const vip of community.vips) {
            for (const channel of twitch_channels) {
                if (listed_channels.includes(channel.twitch_id)) {
                    continue;
                }
                if (vip.login == channel.twitch_id) {
                    listed_channels.push(channel.twitch_id);
                    await add_list(channel.twitch_id);
                }
            }
        }
    }

    if (check_staff.checked) {
        for (const staff of community.staff) {
            for (const channel of twitch_channels) {
                if (listed_channels.includes(channel.twitch_id)) {
                    continue;
                }
                if (staff.login == channel.twitch_id) {
                    listed_channels.push(channel.twitch_id);
                    await add_list(channel.twitch_id);
                }
            }
        }
    }

    if (check_viewer.checked) {
        for (const viewer of community.viewers) {
            for (const channel of twitch_channels) {
                if (listed_channels.includes(channel.twitch_id)) {
                    continue;
                }
                if (viewer.login == channel.twitch_id) {
                    listed_channels.push(channel.twitch_id);
                    await add_list(channel.twitch_id);
                }
            }
        }
    }
}

function reset_list() {
    updateTarget();
}

async function postToX() {
    if (current_login == null || listed_channels.length == 0) {
        return;
    }

    let current_login_status = await twitch_get_channel_status(current_login);
    if (!current_login_status) {
        return;
    }

    let customText = `${current_login_status.display_name}を視聴中の配信者:`
    for (let index = 0; index < listed_channels.length; index++) {
        const element = listed_channels[index];
        let element_login_status = await twitch_get_channel_status(element);
        if (!element_login_status) {
            return;
        }
        customText += ` ${element_login_status.display_name}`;
        if (index < listed_channels.length - 1) {
            customText += ",";
        }
    }
    const text = encodeURIComponent(customText);
    const url = encodeURIComponent(`${window.location.origin}${window.location.pathname}?id=${current_login}`);
    const hashtags = encodeURIComponent("whoiswatchingtwitch");
    const tweetUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}&hashtags=${hashtags}`;
    tweet_button.href = tweetUrl;
}