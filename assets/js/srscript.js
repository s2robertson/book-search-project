const parsedParams = new URLSearchParams(window.location.search);

if (!parsedParams.get('type')) {
  throw new Error(`Missing search type: ${JSON.stringify(Object.fromEntries(parsedParams))}`);
} else if (!parsedParams.get('q')) {
  throw new Error(`Missing search term: ${JSON.stringify(Object.fromEntries(parsedParams))}`);
}

const searchSource = parsedParams.get('source') || 'googlebooks';
const searchQuery = parsedParams.get('q');
const searchType = parsedParams.get('type');

switch (searchSource) {
  case 'googlebooks':
    fetchFromGoogleBooks(searchQuery, searchType);
    break;
  case 'openlibrary':
    fetchFromOpenLibrary(searchQuery, searchType);
    break;
}

function fetchFromGoogleBooks(searchQuery, searchType) {
  let fetchQuery = '';
  if (searchType === 'author') {
    fetchQuery = `inauthor:${searchQuery}`;
  } else {
    fetchQuery = searchQuery;
  }

  fetch(`https://www.googleapis.com/books/v1/volumes?q=${fetchQuery}&key=AIzaSyAX-16OMQwreOY3_0F0o2gbQ2hqtRpvBic`)
    .then((result) => {
      if (!result.ok) {
        throw new Error(`Fetch failed: ${result}`);
      }
      return result.json();
    })
    .then((data) => {
      const listEl = document.createElement('ul');
      data.items.forEach((item) => {
        const title = item.volumeInfo.title;
        const author = item.volumeInfo.authors?.join(', ') || '';
        const description = item.volumeInfo.description;
        let imageUrl = item.volumeInfo.imageLinks?.thumbnail;
        if (!imageUrl) {
          imageUrl = item.volumeInfo.imageLinks?.smallThumbnail;
        }
        listEl.append(buildListItem(title, author, description, imageUrl));
      });

      resultContentEl.replaceChildren(listEl);
    });
}

function fetchFromOpenLibrary(searchQuery, searchType) {
  let fetchQuery = '';
  if (searchType === 'author') {
    fetchQuery = `author:${searchQuery}`;
  } else {
    fetchQuery = `q=${searchQuery}`;
  }

  fetch(`https://openlibrary.org/search.json?${fetchQuery}&limit=10`)
    .then((result) => {
      if (!result.ok) {
        throw new Error(`Fetch failed: ${result}`);
      }
      return result.json();
    })
    .then((data) => {
      const listEl = document.createElement('ul');

      data.docs.forEach((doc) => {
        const title = doc.title;
        const author = doc.author_name?.join(', ') || '';
        const description = '';
        const imageUrl = '';
        listEl.append(buildListItem(title, author, description, imageUrl));
      });
      resultContentEl.replaceChildren(listEl);
    });
}

function buildListItem(title, author, description, imageUrl) {
  const liEl = document.createElement('li');
  const detailsEl = document.createElement('details');

  const summaryEl = document.createElement('summary');
  summaryEl.innerHTML = `<strong>${title}</strong> ${author}`;
  const descriptionEl = document.createElement('p');
  descriptionEl.textContent = description;

  let imageEl = '';
  if (imageUrl) {
    imageEl = document.createElement('img');
    imageEl.src = imageUrl;
  }

  detailsEl.append(summaryEl, imageEl, descriptionEl);
  liEl.append(detailsEl);
  return liEl;
}
