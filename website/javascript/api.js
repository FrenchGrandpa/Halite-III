export const API_SERVER_URL = "http://35.190.3.178/v1/api";
export const LOGIN_SERVER_URL = "http://35.190.3.178/v1/login";

// TODO: also cache login in local cookie so we don't have to do so many round trips
let cached_me = null;
let logged_in = null;

export function me_cached() {
    if (window.localStorage["cache"]) {
        return {
            user_id: window.localStorage["user_id"],
            username: window.localStorage["username"],
        };
    }
    else {
        return null;
    }
}

export function me() {
    if (cached_me !== null) return Promise.resolve(cached_me);
    else if (logged_in === false) return Promise.resolve(null);

    return $.get({
        url: `${LOGIN_SERVER_URL}/me`,
        xhrFields: {
            withCredentials: true,
        },
    }).then((me) => {
        if (me === null) {
            logged_in = false;
            return null;
        }
        logged_in = true;
        return get_user(me.user_id).then((user) => {
            cached_me = user;
            // TODO: invalidate this cache every so often
            window.localStorage["cache"] = Date.now();
            window.localStorage["user_id"] = user.user_id;
            window.localStorage["username"] = user.username;
            return user;
        });
    });
}

export function get_user(user_id) {
    return $.get({
        url: `${API_SERVER_URL}/user/${user_id}`,
        xhrFields: {
            withCredentials: true,
        },
    });
}

export function make_profile_image_url(username) {
    return `https://github.com/${username}.png`;
}

export function list_bots(user_id) {
    return $.get({
        url: `${API_SERVER_URL}/user/${user_id}/bot`,
    });
}

export function update_bot(user_id, bot_id, file, progress_callback) {
    const method = bot_id === null ? "POST" : "PUT";
    const endpoint = bot_id === null ? "bot" : `bot/${bot_id}`;

    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", function(e) {
        if (e.lengthComputable) {
            progress_callback(e.loaded / e.total);
        }
    }, false);
    xhr.upload.addEventListener("load", function(e) {
        progress_callback(1);
    }, false);
    xhr.withCredentials = true;
    xhr.open(method, `${API_SERVER_URL}/user/${user_id}/${endpoint}`);

    const form_data = new FormData();
    form_data.append("name", "botFile");
    form_data.append("botFile", file);

    xhr.send(form_data);

    return new Promise((resolve, reject) => {
       xhr.onload = function(e) {
            if (this.status === 200) {
                resolve();
            }
            else {
                const response = JSON.parse(e.target.responseText);
                reject(response);
            }
       };
    });
}

export function list_organizations() {
    return $.get({
        url: `${API_SERVER_URL}/organization`,
    });
}

export function register_me(data) {
    return $.post({
        url: `${API_SERVER_URL}/user`,
        data: JSON.stringify(data),
        contentType: "application/json",
        xhrFields: {
            withCredentials: true,
        },
    });
}

export function get_replay(game_id, progress_callback) {
    let game_data_promise = Promise.resolve($.get(`${API_SERVER_URL}/user/0/match/${game_id}`));
    let replay_promise = new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.withCredentials = true;
        xhr.open("GET", `${API_SERVER_URL}/user/0/match/${game_id}/replay`, true);
        xhr.responseType = "arraybuffer";

        if (progress_callback) {
            xhr.onprogress = function(e) {
                progress_callback(e.loaded, e.total);
            };
        }

        xhr.onload = function(e) {
            if (this.status === 200) {
                const blob = this.response;
                resolve(blob);
            }
            else {
                reject();
            }
        };

        xhr.send();
    });
    return Promise.all([game_data_promise, replay_promise]).then(([game, replay]) => {
        return {
            game: game,
            replay: replay,
        }
    });
}

export function leaderboard(filters) {
    return $.get({
        url: `${API_SERVER_URL}/leaderboard`,
        data: {
            filter: filters,
        }
    });
}
