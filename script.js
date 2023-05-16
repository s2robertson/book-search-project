var searchForm = document.querySelector('#search-form');

function handleSearchFormSubmit(event) {
  event.preventDefault();

  var searchInput = document.querySelector('#search-input').value;
  var formatInput = document.querySelector('#books').value;

  if (!searchInput) {
    console.error('Please input a search value!');
    return;
  }

  var queryString = './search-results.html?q=' + searchInput + '&format=' + formatInput;

  location.assign(queryString);
}

searchForm.addEventListener('search', handleSearchFormSubmit);
