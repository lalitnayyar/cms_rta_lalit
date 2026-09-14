I am looking for applicaiton with professional looking front page which will have link repository to facilitate my employees to go to link also it should have administration section 
(uid and password) to add link. also in admin section to have color, theme (give me atleast 5 options) , enable/ disable link, associate image + heading + small description of link. 
also should have capture Ipaddress and time of visitig site and audit logs application in light weight database ; it will be good to have some kind of notice board system with publish and auto 
expirey date , admin will publish (image , heading , description , date of publish , expiry of notice) it should have database to see past notices for reference.

Manage script enhancements:
- manage.sh now supports selecting host and port when starting the application (useful when deploying or exposing the app on a specific port).
- Database path: data/site.db (SQLite). init-db creates required tables: admins, links, visits, notices, notices_history.
- Admin creation uses SHA-256(username:password) by default; consider upgrading to bcrypt for production.
- Notices expiry can be executed via the 'expire-notices' command (or run from cron) to archive expired notices to notices_history.

If any of the above requirements should be changed (for example a different DB location, alternate password hashing, or an automatic scheduler for expiry), indicate preferences and the manage.sh will be updated accordingly.
