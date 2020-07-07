# Internal VOIP controller


Get output from service via CLI:

`journalctl -u internal -e -f`


Manage extensions/users/IPs in file [`data/extensions.json`](https://github.com/thefreighthero/internal-server/blob/master/data/extensions.json)

Find current IPs and usernames: https://login.voicedata.nl/ext/managedvoice#channels

### Manage service

Use `service.sh` script to manage service. Adjust IP if needed.

`service.sh -s internal -a start -i 192.168.1.116`

`service.sh -s internal -a stop -i 192.168.1.116`

`service.sh -s internal -a restart -i 192.168.1.116`


### New phone config

Phone settings eg `http://192.168.1.17/servlet?m=mod_data&p=features-remotecontrl&q=load`
User: admin
Pass: `0` + customer nr voicedata

Set `Push XML Server IP Address` and `Action URI Allow IP List` to server IP (`192.168.1.116`)
