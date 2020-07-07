#!/bin/bash


#control services on remote server

# set defaults
service=""
action="start"
cert_file="$USERPROFILE/.ssh/id_rsa"
remote_user="root"
server_ip="192.168.1.116"
status_request=NO

# get arguments
positional=()
while [[ $# -gt 0 ]]
do
key="$1"

case ${key} in
    -s|--service)
    service="$2"
    shift # past argument
    shift # past value
    ;;
    -a|--action)
    action="$2"
    shift # past argument
    shift # past value
    ;;
    -i|--server_ip)
    server_ip="$2"
    shift # past argument
    shift # past value
    ;;
    -u|--remote_user)
    remote_user="$2"
    shift # past argument
    shift # past value
    ;;
    -c|--cert_file)
    cert_file="$2"
    shift # past argument
    shift # past value
    ;;
    -r|--status_request)
    status_request=YES
    shift # past argument
    ;;
    *)    # unnamed option
    positional+=("$1") # save it in an array for later
    shift # past argument
    ;;
esac
done
set -- "${positional[@]}" # restore positional parameters

# exit if incomplete
if [ -z ${service} ]
then
    echo "Value for service is required! (-s or --service)"
    exit
fi

#===============================================================================
echo "IP: ${server_ip}"

if [ ${action} = 'status' ]
then
    status_request=YES
else
    ssh -i ${cert_file} ${remote_user}@${server_ip} service ${service} ${action}
fi


if [ ${status_request} = YES ]
then
    ssh -i ${cert_file} ${remote_user}@${server_ip} systemctl status ${service}.service
fi

