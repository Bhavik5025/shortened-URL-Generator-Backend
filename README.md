<h1>Shortened URL Generator</h1>
<h2>API Endpoints</h2>

<h3>User Management</h3>
<ul>
  <li><code>/Register</code> - Register a new user</li>
  <li><code>/Login</code> - Log in an existing user</li>
</ul>

<h3>URL Management</h3>
<ul>
  <li><code>/createShortendUrl</code> - Generate a shortened URL with an friendly name</li>
  <li><code>/Url_status</code> - Check the status of a specific URL</li>
  <li><code>/success_count</code> - Get the number of successful clicks for a URL</li>
  <li><code>/failure_count</code> - Get the number of failed clicks for a URL</li>
  <li><code>/shortendurls</code> - Retrieve a list of shortened URLs for a user</li>
  <li><code>/search</code> - Search for a URL by its friendly name </li>
  <li><code>/:short_id</code> - goto original url using short url </li>
</ul>

<h2>Database Schema Requirements</h2>

<h3>Users Schema</h3>
<p>Stores user information, including their name,password, and account creation timestamp.</p>

<h3>URLs Schema</h3>
<p>Manages data for shortened URLs, including the original URL, the generated shortened URL, a custom friendly name, the associated user, and the creation timestamp.</p>

<h3>Counts Schema</h3>
<p>Tracks click statistics for each shortened URL, including the status of clicks (success or failure), and associated URL ID.</p>


<h2>Setup Instructions</h2>
<ol>
  <li>Install dependencies by running <code>npm install</code> in the project directory.</li>
  <li>Start the development server using <code>npm run dev</code>.</li>
  <li>For the database, use <a href="https://www.mongodb.com/products/compass" target="_blank">MongoDB Compass</a> to manage and explore your database.</li>
  <li>Use <a href="https://www.postman.com/" target="_blank">Postman</a> for testing API endpoints during development.</li>

</ol>
