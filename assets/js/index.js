var searchForm = document.querySelector('#search-form');

function handleSearchFormSubmit(event) {
  event.preventDefault();

  var searchInput = document.querySelector('#search-input').value;
  var typeInput = document.querySelector('#search-type').value;
  var sourceInput = document.querySelector('#search-source').value;

  if (!searchInput) {
    console.error('Please input a search value!');
    return;
  }

  var queryString = './result.html?q=' + searchInput + '&type=' + typeInput + '&source=' + sourceInput;

  location.assign(queryString);
}
searchForm.addEventListener('submit', handleSearchFormSubmit);