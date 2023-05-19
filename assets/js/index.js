document.addEventListener('DOMContentLoaded',function() {
  var searchForm = document.getElementById('search-form');

  function handleSearchFormSubmit(event) {
    event.preventDefault();

    const searchInputEl = document.querySelector('#search-input');
    var searchInput = searchInputEl.value;
    var typeInput = document.querySelector('#search-type').value;
    var sourceInput = document.querySelector('#search-source').value;

    var queryString = './result.html?q=' + searchInput + '&type=' + typeInput + '&source=' + sourceInput;
    location.assign(queryString);
  }
  searchForm.addEventListener('submit', handleSearchFormSubmit);
});