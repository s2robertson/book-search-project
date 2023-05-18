let listItemRawData = [];
const favouritesKey = 'book-search-favourites';
const favourites = JSON.parse(localStorage.getItem(favouritesKey) || "{}");
const removeFromFavouritesHTML = `<span class="favourited">&starf;</span> Remove from favourites`;
const addToFavouritesHTML = '&star; Add to favourites';
let page = 1;

let unparsedParams = document.location.search;
if (unparsedParams.startsWith('?')) {
    unparsedParams = unparsedParams.slice(1);
}
unparsedParams = unparsedParams.split('&');
let parsedParams = {};
unparsedParams.forEach(pair => {
    const [key, value] = pair.split('=');
    parsedParams[key] = value;
});

const searchQueryEl = document.getElementById('search-query');
searchQueryEl.value = parsedParams.q || '';
const searchTypeEl = document.getElementById('search-type');
if (!parsedParams.type) {
    parsedParams.type = 'subject';
}
searchTypeEl.value = parsedParams.type;
const searchSourceEl = document.getElementById('search-source');
if (!parsedParams.source) {
    parsedParams.source = 'googlebooks';
}
searchSourceEl.value = parsedParams.source;
const loadMoreButton = document.getElementById('load-more-button');
performSearch();

function performSearch() {
    if (!parsedParams.q) {
        searchQueryEl.classList.remove('is-primary');
        searchQueryEl.classList.add('is-danger');
        return;
    }
    searchQueryEl.classList.remove('is-danger');
    searchQueryEl.classList.add('is-primary');

    const searchSource = parsedParams.source || 'googlebooks';
    switch (searchSource) {
        case 'googlebooks':
            fetchFromGoogleBooks(parsedParams.q, parsedParams.type);
            break;
        case 'openlibrary':
            fetchFromOpenLibrary(parsedParams.q, parsedParams.type);
            break;
    }
}

function handleNewSearch(event) {
    event.preventDefault();
    const searchQueryValue = searchQueryEl.value;
    const searchTypeValue = searchTypeEl.value;
    const searchSourceValue = searchSourceEl.value;

    if (!searchQueryValue.trim()) {
        searchQueryEl.classList.remove('is-primary');
        searchQueryEl.classList.add('is-danger');
        return;
    }
    searchQueryEl.classList.remove('is-danger');
    searchQueryEl.classList.add('is-primary');

    parsedParams.q = searchQueryValue;
    parsedParams.type = searchTypeValue;
    parsedParams.source = searchSourceValue;
    listItemRawData = [];
    page = 1;
    performSearch();
}
const searchForm = document.getElementById('search-form');
searchForm.addEventListener('submit', handleNewSearch);

function fetchFromGoogleBooks(searchQuery, searchType) {
    let fetchQuery = '';
    if (searchType === 'author') {
        fetchQuery = "inauthor:" + searchQuery;
    } else {
        fetchQuery = searchQuery;
    }

    const startIndex = (page - 1) * 10; 
    fetch(`https://www.googleapis.com/books/v1/volumes?q=${fetchQuery}&startIndex=${startIndex}`)
        .then(result => {
            if (!result.ok) {
                throw new Error(`Fetch failed: ${result}`);
            }
            return result.json();
        })
        .then(data => {
            data.items.forEach(item => {
                listItemRawData.push(item);
            });
            buildUlFromRawDataGoogleBooks(startIndex);

            if (listItemRawData.length < data.totalItems) {
                loadMoreButton.removeAttribute('disabled');
            } else {
                loadMoreButton.setAttribute('disabled', true);
            }
        });
}

function buildUlFromRawDataGoogleBooks(startIndex = 0) {
    const listEl = document.getElementById('result-list');
    if (startIndex === 0) {
        listEl.innerHTML = '';
    }

    for (let i = startIndex; i < listItemRawData.length; i++) {
        const item = listItemRawData[i];

        const title = item.volumeInfo.title;
        const author = item.volumeInfo.authors?.join(', ') || '';
        const description = item.volumeInfo.description;
        let imageUrl = item.volumeInfo.imageLinks?.thumbnail;
        if (!imageUrl) {
            imageUrl = item.volumeInfo.imageLinks?.smallThumbnail;
        }
        const listItem = buildListItem(title, author, description, imageUrl);
        listItem.dataset.listIndex = i;
        
        listEl.append(listItem);
    }

    // using the onclick attribute erases any previous event listeners
    listEl.onclick = function (event) {
        const listItem = event.target.closest('li');
        const listIndex = listItem?.dataset.listIndex;
        if (listIndex != undefined && listIndex != null) {
            const rawItem = listItemRawData[listIndex];
            buildDetailsPaneGoogleBooks(rawItem);
            openModal();
        }
    };
}

function fetchFromOpenLibrary(searchQuery, searchType) {
    let fetchQuery = '';
    if (searchType === 'author') {
        fetchQuery = `author=${searchQuery}`;
    } else {
        fetchQuery = `q=${searchQuery}`;
    }

    const startIndex = (page - 1) * 10; 
    fetch(`https://openlibrary.org/search.json?${fetchQuery}&limit=10&offset=${startIndex}`)
        .then(result => {
            if (!result.ok) {
                throw new Error(`Fetch failed: ${result}`);
            }
            return result.json();
        })
        .then(data => {            
            data.docs.forEach(doc => {
                listItemRawData.push(doc);
            });

            buildUlFromRawDataOpenLibrary(startIndex);

            if (listItemRawData.length < data.numFound) {
                loadMoreButton.removeAttribute('disabled');
            } else {
                loadMoreButton.setAttribute('disabled', true);
            }
        });
}

function buildUlFromRawDataOpenLibrary(startIndex = 0) {
    const listEl = document.getElementById('result-list');
    if (startIndex === 0) {
        listEl.innerHTML = '';
    }

    for (let i = startIndex; i < listItemRawData.length; i++) {
        const doc = listItemRawData[i];

        const title = doc.title;
        const author = doc.author_name?.join(', ') || '';
        let description = '';
        if (doc.subject) {
            description = `Subjects: ${doc.subject.join(', ')}`;
        }
        const imageUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
        const listItem = buildListItem(title, author, description, imageUrl);
        listItem.dataset.listIndex = i;
        
        listEl.append(listItem);
    }

    // use the onclick attribute to erase outstanding event listeners
    listEl.onclick = function (event) {
        const listItem = event.target.closest('li');
        const listIndex = listItem?.dataset.listIndex;
        if (listIndex != undefined && listIndex != null) {
            const rawItem = listItemRawData[listIndex];
            buildDetailsPaneOpenLibrary(rawItem);
            openModal();
        }
    };
}

function buildListItem(title, author, description, imageUrl) {
    const listItem = document.createElement('li');

    if (imageUrl) {
        const thumbnailImg = document.createElement('img');
        thumbnailImg.src = imageUrl;
        listItem.appendChild(thumbnailImg);
    }

    const titleEl = document.createElement('h2');
    titleEl.textContent = title;
    listItem.appendChild(titleEl);

    const authorEl = document.createElement('p');
    authorEl.textContent = `Author(s): ${author}`;
    listItem.appendChild(authorEl);

    const descriptionEl = document.createElement('p');
    descriptionEl.textContent = description;
    listItem.appendChild(descriptionEl);

    return listItem;
}

function buildDetailsPaneGoogleBooks(item) {
    const title = item.volumeInfo.title;
    const subtitle = item.volumeInfo.subtitle;
    const author = item.volumeInfo.authors?.join(', ') || '';
    let imageUrl = item.volumeInfo.imageLinks?.thumbnail;
    if (!imageUrl) {
        imageUrl = item.volumeInfo.imageLinks?.smallThumbnail;
    }
    const description = item.volumeInfo.description;
    const publishedDate = item.volumeInfo.publishedDate;
    const buyLink = item.saleInfo?.buyLink;

    const titleEl = document.createElement('h2');
    titleEl.textContent = title;
    let subtitleEl = '';
    if (subtitle) {
        subtitleEl = document.createElement('h3');
        subtitleEl.textContent = subtitle;
    }
    const authorEl = document.createElement('p');
    if (author) {
        authorEl.textContent = author;
    }
    let imageEl = '';
    if (imageUrl) {
        imageEl = document.createElement('img');
        imageEl.src = imageUrl;
    }
    const descriptionEl = document.createElement('p');
    if (description) {
        descriptionEl.textContent = description;
    }
    const publishDateEl = document.createElement('p');
    if (publishedDate) {
        publishDateEl.textContent = `Published: ${publishedDate}`;
    }
    const purchaseEl = document.createElement('p');
    if (buyLink) {
        const link = document.createElement('a');
        link.href = buyLink;
        link.textContent = `Purchase ${title}`;
        purchaseEl.append(link);
    }

    const itemFavouritesKey = "gb" + item.id;
    const initialFavouriteData = favourites[itemFavouritesKey];
    const favouritesButton = document.createElement('button');
    if (initialFavouriteData) {
        favouritesButton.innerHTML = removeFromFavouritesHTML;
    } else {
        favouritesButton.innerHTML = addToFavouritesHTML;
    }
    favouritesButton.classList.add('button');

    favouritesButton.addEventListener('click', () => {
        const currFavouriteData = favourites[itemFavouritesKey];
        if (currFavouriteData) {
            delete favourites[itemFavouritesKey];
            favouritesButton.innerHTML = addToFavouritesHTML;
        } else {
            favourites[itemFavouritesKey] = {
                type: 'googlebooks',
                data: item
            };
            favouritesButton.innerHTML = removeFromFavouritesHTML;
        }
        localStorage.setItem(favouritesKey, JSON.stringify(favourites));
    });

    document.getElementById('details-box').replaceChildren(titleEl, subtitleEl, authorEl, imageEl, descriptionEl, publishDateEl, purchaseEl, favouritesButton);
}

function buildDetailsPaneOpenLibrary(doc) {
    const title = doc.title;
    const subtitle = doc.subtitle;
    const author = doc.author_name?.join(', ') || '';
    let description = '';
    if (doc.subject) {
        description = `Subjects: ${doc.subject.join(', ')}`;
    }
    const firstPublishedDate = doc.first_publish_year;
    const internetArchiveId = doc.ia && doc.ia[0];
    const goodreadsId = doc.id_goodreads && doc.id_goodreads[0];
    const librarythingId = doc.id_librarything && doc.id_librarything[0];

    const titleEl = document.createElement('h2');
    titleEl.textContent = title;
    let subtitleEl = '';
    if (subtitle) {
        subtitleEl = document.createElement('h3');
        subtitleEl.textContent = subtitle;
    }
    const authorEl = document.createElement('p');
    if (author) {
        authorEl.textContent = author;
    }
    const descriptionEl = document.createElement('p');
    if (description) {
        descriptionEl.textContent = description;
    }
    const firstPublishDateEl = document.createElement('p');
    if (firstPublishedDate) {
        firstPublishDateEl.textContent = `First published: ${firstPublishedDate}`;
    }
    const otherSitesListEl = document.createElement('ul');
    if (internetArchiveId) {
        const iaListEl = document.createElement('li');
        iaListEl.innerHTML = `<a href="https://archive.org/details/${internetArchiveId}">View ${title} on the Internet Archive</a>`
        otherSitesListEl.append(iaListEl);
    }
    if (goodreadsId) {
        const goodreadsListEl = document.createElement('li');
        goodreadsListEl.innerHTML = `<a href="https://www.goodreads.com/book/show/${goodreadsId}">View ${title} on goodreads</a>`;
        otherSitesListEl.append(goodreadsListEl);
    }
    if (librarythingId) {
        const librarythingListEl = document.createElement('li');
        librarythingListEl.innerHTML = `<a href="https://www.librarything.com/work/${librarythingId}">View ${title} on LibraryThing</a>`;
        otherSitesListEl.append(librarythingListEl);
    }

    const itemFavouritesKey = "ol" + doc.key;
    const initialFavouriteData = favourites[itemFavouritesKey];
    const favouritesButton = document.createElement('button');
    if (initialFavouriteData) {
        favouritesButton.innerHTML = removeFromFavouritesHTML;
    } else {
        favouritesButton.innerHTML = addToFavouritesHTML;
    }
    favouritesButton.classList.add('button');
    
    favouritesButton.addEventListener('click', () => {
        const currFavouriteData = favourites[itemFavouritesKey];
        if (currFavouriteData) {
            delete favourites[itemFavouritesKey];
            favouritesButton.innerHTML = addToFavouritesHTML;
        } else {
            favourites[itemFavouritesKey] = {
                type: 'openlibrary',
                data: doc
            };
            favouritesButton.innerHTML = removeFromFavouritesHTML;
        }
        localStorage.setItem(favouritesKey, JSON.stringify(favourites));
    });

    document.getElementById('details-box').replaceChildren(titleEl, subtitleEl, authorEl, descriptionEl, firstPublishDateEl, otherSitesListEl, favouritesButton);
}

function showFavouritesList() {
    const favouritesList = [];
    for (const key in favourites) {
        const listItem = document.createElement('li');
        const { type, data } = favourites[key];
        let title;
        let author;
        let eventHandler;
        
        if (type == 'googlebooks') {
            title = data.volumeInfo.title;
            author = data.volumeInfo.authors?.join(', ') || '';
            eventHandler = function() {
                buildDetailsPaneGoogleBooks(data);
                openModal();
            }
        } else {
            title = data.title;
            author = data.author_name?.join(', ') || '';
            eventHandler = function() {
                buildDetailsPaneOpenLibrary(data);
                openModal();
            }
        }

        listItem.innerHTML = `<strong>${title}</strong> ${author}`;
        listItem.addEventListener('click', eventHandler);
        favouritesList.push(listItem);
    }

    document.querySelector('#result-content h2').textContent = 'Favourites'
    document.getElementById('result-list').replaceChildren(...favouritesList);
    const showFavouritesButton = document.getElementById('show-favourites-button');
    showFavouritesButton.textContent = 'Hide Favourites';
    showFavouritesButton.onclick = hideFavouritesList;
    loadMoreButton.style.display = 'none';
}
// Showing the favourites is the page default
document.getElementById('show-favourites-button').onclick = showFavouritesList;

function hideFavouritesList() {
    document.querySelector('#result-content h2').textContent = 'Favourites'
    const showFavouritesButton = document.getElementById('show-favourites-button');
    showFavouritesButton.textContent = 'Show Favourites';
    showFavouritesButton.onclick = showFavouritesList;

    if (parsedParams.source === 'googlebooks') {
        buildUlFromRawDataGoogleBooks(0);
    } else {
        buildUlFromRawDataOpenLibrary(0);
    }
    loadMoreButton.style.display = '';
}

function buildModalContent(titleEl, subtitleEl, authorEl, descriptionEl, publishDateEl, purchaseEl) {
    const modalContent = document.getElementById('details-box');
    modalContent.replaceChildren(titleEl, subtitleEl, authorEl, descriptionEl, publishDateEl, purchaseEl);
}

function buildModalContent(titleEl, subtitleEl, authorEl, descriptionEl, otherSitesListEl) {
    const modalContent = document.getElementById('details-content');
    modalContent.replaceChildren(titleEl, subtitleEl, authorEl, descriptionEl, otherSitesListEl);
}
  
  
function openModal() {
    const modal = document.getElementById('details-modal');
    modal.classList.add('is-active');
}
  
function closeModal() {
    const modal = document.getElementById('details-modal');
    modal.classList.remove('is-active');
}
    
(document.querySelectorAll('.modal-close, .modal-background') || []).forEach(closeElem => {
    closeElem.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal-close') || event.target.classList.contains('modal-background')) {
          closeModal();
        }
    });
});

loadMoreButton.addEventListener('click', function () {
    page++; 
    if (parsedParams.source === 'googlebooks') {
        fetchFromGoogleBooks(parsedParams.q, parsedParams.type);
    } else if (searchSourceEl === 'openlibrary') {
        fetchFromOpenLibrary(parsedParams.q, parsedParams.type);
    }
});
