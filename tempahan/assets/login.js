// Compatibility for bookmarks to the former booking login.
const loginQuery = new URLSearchParams(location.search);
if (!loginQuery.has('next')) loginQuery.set('next', '/tempahan/');
location.replace('/log-masuk/?' + loginQuery.toString());
