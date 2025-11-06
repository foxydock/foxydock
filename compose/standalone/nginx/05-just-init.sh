#!/usr/bin/env bash
set -e

just_log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')][fdn_init] $1"
}

just_exec_cmd() {
    just_log "CMD: [$1]"
    eval "$1"
}

just_exec_cmd "find /var/run/nginx -maxdepth 1 -name '*.sock' -delete"
just_exec_cmd "chown www-data:www-data -R /var/log/nginx/"

if [ ! -e /usr/share/nginx/html ]; then
    just_log "dir[/usr/share/nginx/html] is not found. Will create it..."
    just_exec_cmd "mkdir -p /usr/share/nginx/html"
    just_log "dir[/usr/share/nginx/html] is created."
fi

if [ ! -e /etc/nginx/html ]; then
    just_log "dir[/etc/nginx/html] is not found. Will create it..."
    just_exec_cmd "mkdir -p /etc/nginx/html"
    just_log "dir[/etc/nginx/html] is created."
fi

latest_example_snippets_version="$(cat /etc/nginx/snippets/example/by_version/latest_version)"
latest_example_snippets_directory="/etc/nginx/snippets/example/by_version/${latest_example_snippets_version}"
user_current_snippets_directory="/etc/nginx/snippets/private/by_version/current"

if [ ! -e $user_current_snippets_directory ]; then
    just_log "file[$user_current_snippets_directory] is not found. Will create it..."
    user_versioned_snippets_directory="/etc/nginx/snippets/private/by_version/${latest_example_snippets_version}"
    mkdir -p "${user_versioned_snippets_directory}"
    just_exec_cmd "ln -s ${latest_example_snippets_version} $user_current_snippets_directory"
    if [ ! -e "${user_versioned_snippets_directory}/nginx.conf" ]; then
        just_log "file[${user_versioned_snippets_directory}/nginx.conf] is not found. Will create it..."
        echo -e "include snippets/example/by_version/${latest_example_snippets_version}/nginx.conf;\n" > "${user_versioned_snippets_directory}/nginx.conf"
        just_log "file[${user_versioned_snippets_directory}/nginx.conf] is created."
    fi
fi

user_current_version="$(basename $(readlink $user_current_snippets_directory))"

just_log "Current ID[$(id)] latest_example_snippets_version[${latest_example_snippets_version}] user_current_version[${user_current_version}]"

user_current_version_in_pure_num_text=${user_current_version#v}
current_user_config_directory="/etc/nginx/snippets/private/by_version/current/config"
current_example_config_directory="/etc/nginx/snippets/example/by_version/${user_current_version}/config"
mixins_config_directory="/etc/nginx/snippets/config/by_version/${user_current_version}"
just_exec_cmd "mkdir -p $mixins_config_directory"

# Function to create symbolic links for files and directories
link_items() {
    local source_dir="$1"
    local target_dir="$2"

    for item in "$source_dir"/*; do
        # 过滤掉空目录的情况。因为一旦 $source_dir 是空目录， $item 会变成 $source_dir/*
        # 这是一个无效路径，所以要跳过
        [ -e "$item" ] || continue

        local basename_item=$(basename "$item")
        local target_path="$target_dir/$basename_item"

        if [ -d "$item" ]; then
            # For directories, recursively link contents
            just_exec_cmd "mkdir -p $target_path"
            link_items "$item" "$target_path"
        else
            # For files, create symbolic link
            just_exec_cmd "ln -sf $item $target_path"
        fi
    done
}

if (( 10#$user_current_version_in_pure_num_text > 2 )); then
    # Link example config files
    just_log "Link example config files..."
    link_items "$current_example_config_directory" "$mixins_config_directory"
    # Link user config files if they exist
    if [ -e "$current_user_config_directory" ]; then
        just_log "Link user config files..."
        link_items "$current_user_config_directory" "$mixins_config_directory"
    fi
fi

if [ ! -e /etc/ssl/dhparam/dhe4096.pem ]; then
    just_log "file[/etc/ssl/dhparam/dhe4096.pem] is not found. Generating..."
    openssl dhparam -out /etc/ssl/dhparam/dhe4096.pem 4096
    just_log "file[/etc/ssl/dhparam/dhe4096.pem] is generated."
fi

# if [ ! -e /etc/nginx/geoip/geoip.mmdb ]; then
#     just_log "file[/etc/nginx/geoip/geoip.mmdb] is not found. Will use the default one..."
#     cp /etc/nginx/geoip/example/geoip.mmdb /etc/nginx/geoip/geoip.mmdb
# fi

just_log "All done!"
