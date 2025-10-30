#!/usr/bin/env bash
the_realpath_feature_flag="-P"
my_file_name="$(basename "$0")"

just_log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')][${my_file_name}] ${1}"
}

exec_cmd() {
    local __tmp_cmd="$1"
    just_log "CMD[$__tmp_cmd]"
    eval "$__tmp_cmd"
}

if [[ x"$(realpath --help | grep -w '\-\-canonicalize\-missing')" != "x" ]]; then
    just_log "[$(which realpath)] support '--canonicalize-missing'"
    the_realpath_feature_flag="-Pm"
fi

if [ ! -e /mnt/justsave/docker/compose/global_default.env ]; then
    if [[ "$(date +%z 2>/dev/null)" == "+0800" ]]; then
        exec_cmd 'bash -c "cd /mnt/justsave/docker/compose && ln -s global_defaul{t.example,t}.env"'
        just_log "Created a global default env file as a symbolic link. Checking..."
    else
        exec_cmd 'bash -c "cd /mnt/justsave/docker/compose && cp global_defaul{t.example,t}.env"'
        just_log "Created global default env file. Checking..."
    fi

    exec_cmd 'ls -lah /mnt/justsave/docker/compose/global_default.env'
fi

# $1 is group name
# $2 is group id
insert_or_update_group_id() {
    if getent group $1 >/dev/null 2>&1; then
        just_log "Setting Group[$1] id to [$2]..."
        exec_cmd "groupmod -g $2 $1"
    else
        just_log "Adding Group[$1] with id [$2]..."
        exec_cmd "groupadd -g $2 $1"
    fi
}

insert_or_update_group_id docker 2000

# $1 is user name
# $2 is group name
just_add_user_to_group() {
    if [ "`groups $1 | grep -w "$2"`" = "" ]; then
        exec_cmd "gpasswd -a $1 $2"
        echo "User[$1] has been appended to Group[$2]."
    else
        echo "User[$1] in Group[$2] already!"
    fi
}

just_add_user_to_group jenkins docker
just_add_user_to_group gitea docker


##### FIX PERMISSION
exec_cmd 'chmod 600 /mnt/justsave/docker/volume/example/pptpd/moved_root/etc/ppp/*-secrets'



# $1 is the path of directory
create_nginx_dir() {
    local the_nginx_dir_path=$1
    exec_cmd "mkdir -p $the_nginx_dir_path"
    exec_cmd "chown -R www-data:www-data $the_nginx_dir_path"
}

create_nginx_dir /mnt/justsave/docker/volume/default/nginx/moved_root/var/log/nginx
create_nginx_dir /mnt/justsave/docker/volume/default/nginx/moved_root/usr/share/nginx/html

mkdir -p /mnt/justsave/docker/volume/default/nginx/moved_root/etc/nginx/snippets/private/by_version/v3/config
copy_nginx_v3_config() {
    local __rel_target_path="$1"
    __copy_src="/mnt/justsave/docker/volume/example/nginx/moved_root/etc/nginx/snippets/example/by_version/v3/config/${__rel_target_path}"
    __copy_dst="/mnt/justsave/docker/volume/default/nginx/moved_root/etc/nginx/snippets/private/by_version/v3/config/${__rel_target_path}"
    exec_cmd "cp -vp $__copy_src $__copy_dst"
}

copy_nginx_v3_config 'nginx.conf'
copy_nginx_v3_config 'by_context/stream/map_sni___preset_upstream.conf'
copy_nginx_v3_config 'by_context/stream/map_sni___preset_ssl_domain.conf'
copy_nginx_v3_config 'by_app/by_context/http/server/inject_bundle_app_ingress_server.conf'

just_log "ALL DONE."
