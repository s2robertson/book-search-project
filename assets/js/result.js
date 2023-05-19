let listItemRawData = [];
const favouritesKey = 'book-search-favourites';
const favourites = JSON.parse(localStorage.getItem(favouritesKey) || "{}");
const removeFromFavouritesHTML = `<span class="favourited">&starf;</span> Remove from favourites`;
const addToFavouritesHTML = '&star; Add to favourites';
let page = 1;

// if the user navigated here from index.html, get the search parameters from the location
let unparsedParams = document.location.search;
if (unparsedParams.startsWith('?')) {
    // remove leading '?'
    unparsedParams = unparsedParams.slice(1);
}
unparsedParams = unparsedParams.split('&')

let parsedParams = {};
unparsedParams.forEach(pair => {
    const [key, value] = pair.split('=');
    parsedParams[key] = value;
});

/* Set the values in the search form (on the left) to the same as the ones from the location.
 * If any arguments are somehow invalid, this will show up in the search form */
const searchQueryEl = document.getElementById('search-query');
searchQueryEl.value = parsedParams.q ? decodeURIComponent(parsedParams.q) : '';
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
        // show a red border to indicate an error
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

// The user can change search parameters and re-search using the left-hand form
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

    // discard the previous search's data
    listItemRawData = [];
    page = 1;
    performSearch();
}
const searchForm = document.getElementById('search-form');
searchForm.addEventListener('submit', handleNewSearch);

function fetchFromGoogleBooks(searchQuery, searchType) {
    let fetchQuery = '';
    if (searchType === 'title') {
        fetchQuery = 'intitle:' + searchQuery;
    } else if (searchType === 'author') {
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
            buildListFromRawDataGoogleBooks(startIndex);

            // enable or disable the 'load more' button, depending on whether there ARE more
            if (listItemRawData.length < data.totalItems) {
                loadMoreButton.removeAttribute('disabled');
            } else {
                loadMoreButton.setAttribute('disabled', true);
            }
        });
}

function buildListFromRawDataGoogleBooks(startIndex = 0) {
    const listEl = document.getElementById('result-list');
    if (startIndex === 0) {
        // if the user performed a new search, clear old results
        listEl.innerHTML = '';
    }

    for (let i = startIndex; i < listItemRawData.length; i++) {
        const item = listItemRawData[i];

        const title = item.volumeInfo.title;
        const author = item.volumeInfo.authors?.join(', ') || '';
        let imageUrl = item.volumeInfo.imageLinks?.thumbnail;
        if (!imageUrl) {
            imageUrl = item.volumeInfo.imageLinks?.smallThumbnail;
        }
        const listItem = buildListItem(title, author, imageUrl);
        listItem.dataset.listIndex = i;
        
        listEl.append(listItem);
    }

    /* Using the onclick attribute erases any previous event listeners.
     * This is needed if the user switches search sources */
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
    if (searchType === 'title') {
        fetchQuery = `title=${searchQuery}`;
    } else if (searchType === 'author') {
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

            // enable or disable the 'load more' button depending on whether there ARE more
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
        // if the user performed a new search, clear old results
        listEl.innerHTML = '';
    }

    for (let i = startIndex; i < listItemRawData.length; i++) {
        const doc = listItemRawData[i];

        const title = doc.title;
        const author = doc.author_name?.join(', ') || '';
        let imageUrl = '';
        if (doc.cover_i) {
            imageUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
        }
        const listItem = buildListItem(title, author, imageUrl);
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

// builds a list item for the search results
function buildListItem(title, author, imageUrl) {
    const listItem = document.createElement('li');
    listItem.classList.add('is-clearfix', 'is-clickable', 'mb-4');

    if (imageUrl) {
        const thumbnailImg = document.createElement('img');
        thumbnailImg.classList.add('is-pulled-left', 'mr-4');
        thumbnailImg.src = imageUrl;
        listItem.appendChild(thumbnailImg);
    }

    const titleEl = document.createElement('h3');
    titleEl.classList.add('title', 'is-4')
    titleEl.textContent = title;
    listItem.appendChild(titleEl);

    const authorEl = document.createElement('p');
    authorEl.classList.add('subtitle');
    authorEl.textContent = `Author(s): ${author}`;
    listItem.appendChild(authorEl);

    // const descriptionEl = document.createElement('p');
    // descriptionEl.textContent = description;
    // listItem.appendChild(descriptionEl);

    return listItem;
}

// Constructs the contents of the modal window (for Google Books)
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
    const googleBooksLink = item.volumeInfo.infoLink;
    const buyLink = item.saleInfo?.buyLink;

    const titleEl = document.createElement('h3');
    titleEl.classList.add('title', 'is-4');
    titleEl.textContent = title;
    let subtitleEl = '';
    if (subtitle) {
        subtitleEl = document.createElement('h4');
        subtitleEl.classList.add('subtitle');
        subtitleEl.textContent = subtitle;
    }
    const authorEl = document.createElement('p');
    if (author) {
        authorEl.classList.add('subtitle');
        authorEl.textContent = author;
    }
    let imageEl = '';
    if (imageUrl) {
        imageEl = document.createElement('img');
        imageEl.classList.add('is-pulled-left', 'mr-4');
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
    const googleBooksRefEl = document.createElement('p');
    if (googleBooksLink) {
        googleBooksRefEl.innerHTML = `<a href=${googleBooksLink}>View on Google Books</a>`
    }
    const purchaseEl = document.createElement('p');
    if (buyLink) {
        const link = document.createElement('a');
        link.href = buyLink;
        link.textContent = `Purchase ${title}`;
        purchaseEl.append(link);
    }

    // 'favourites' is an object map of items the user has chosen
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
        // currFavouriteData will only be defined if the user has chosen the current item as a favourite
        const currFavouriteData = favourites[itemFavouritesKey];
        if (currFavouriteData) {
            // un-favourite the item
            delete favourites[itemFavouritesKey];
            favouritesButton.innerHTML = addToFavouritesHTML;
        } else {
            // add to favourites
            favourites[itemFavouritesKey] = {
                type: 'googlebooks',
                data: item
            };
            favouritesButton.innerHTML = removeFromFavouritesHTML;
        }
        // record the change in favourite status
        localStorage.setItem(favouritesKey, JSON.stringify(favourites));
    });

    document.getElementById('details-box').replaceChildren(titleEl, subtitleEl, authorEl, imageEl, descriptionEl, publishDateEl, googleBooksRefEl, purchaseEl, favouritesButton);
}

// Constructs the contents of the modal window (for Open Library)
function buildDetailsPaneOpenLibrary(doc) {
    const title = doc.title;
    const subtitle = doc.subtitle;
    const author = doc.author_name?.join(', ') || '';
    let imageUrl = doc.cover_i;
    let description = '';
    if (doc.subject) {
        description = `Subjects: ${doc.subject.join(', ')}`;
    }
    const firstPublishedDate = doc.first_publish_year;
    const internetArchiveId = doc.ia && doc.ia[0];
    const goodreadsId = doc.id_goodreads && doc.id_goodreads[0];
    const librarythingId = doc.id_librarything && doc.id_librarything[0];

    const titleEl = document.createElement('h3');
    titleEl.classList.add('title', 'is-4');
    titleEl.textContent = title;
    let subtitleEl = '';
    if (subtitle) {
        subtitleEl = document.createElement('h4');
        subtitleEl.classList.add('subtitle');
        subtitleEl.textContent = subtitle;
    }
    const authorEl = document.createElement('p');
    if (author) {
        authorEl.classList.add('subtitle');
        authorEl.textContent = author;
    }
    let imageEl = '';
    if (imageUrl) {
        imageEl = document.createElement('img');
        imageEl.classList.add('is-pulled-left', 'mr-4');
        imageEl.src = `https://covers.openlibrary.org/b/id/${imageUrl}-M.jpg`;
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
        // currFavouriteData will only be defined if the current item is favourited
        const currFavouriteData = favourites[itemFavouritesKey];
        if (currFavouriteData) {
            // un-favourite
            delete favourites[itemFavouritesKey];
            favouritesButton.innerHTML = addToFavouritesHTML;
        } else {
            // add to favourites
            favourites[itemFavouritesKey] = {
                type: 'openlibrary',
                data: doc
            };
            favouritesButton.innerHTML = removeFromFavouritesHTML;
        }
        // record the change in favourite status
        localStorage.setItem(favouritesKey, JSON.stringify(favourites));
    });

    document.getElementById('details-box').replaceChildren(titleEl, subtitleEl, authorEl, imageEl, descriptionEl, firstPublishDateEl, otherSitesListEl, favouritesButton);
}

function showFavouritesList() {
    const favouritesList = [];
    for (const key in favourites) {
        const listItem = document.createElement('li');
        listItem.classList.add('is-clearfix', 'is-clickable', 'mb-4')
        const { type, data } = favourites[key];
        let title;
        let author;
        let imageUrl;
        let eventHandler;
        
        // how to extract the necessary data depends on the data's source
        if (type == 'googlebooks') {
            title = data.volumeInfo.title;
            author = data.volumeInfo.authors?.join(', ') || '';
            imageUrl = data.volumeInfo.imageLinks?.thumbnail;
            if (!imageUrl) {
                imageUrl = data.volumeInfo.imageLinks?.smallThumbnail;
            }
            eventHandler = function() {
                buildDetailsPaneGoogleBooks(data);
                openModal();
            }
        } else {
            title = data.title;
            author = data.author_name?.join(', ') || '';
            if (data.cover_i) {
                imageUrl = `https://covers.openlibrary.org/b/id/${data.cover_i}-M.jpg`;
            }
            eventHandler = function() {
                buildDetailsPaneOpenLibrary(data);
                openModal();
            }
        }

        // do the image first so that the other content floats around it
        if (imageUrl) {
            const imageEl = document.createElement('img');
            imageEl.classList.add('is-pulled-left', 'mr-4');
            imageEl.src = imageUrl;
            listItem.append(imageEl);
        }
        const titleEl = document.createElement('h3');
        titleEl.classList.add('title', 'is-4');
        titleEl.textContent = title;
        const authorEl = document.createElement('p');
        authorEl.classList.add('subtitle');
        authorEl.textContent = author;
        listItem.append(titleEl, authorEl);
        listItem.addEventListener('click', eventHandler);
        favouritesList.push(listItem);
    }

    /* The favourites content replaces the search results, but the data is still around,
     * and can be switched back */
    document.querySelector('#result-content h2').textContent = 'Favourites'
    document.getElementById('result-list').replaceChildren(...favouritesList);
    // make the 'show favourites' button hide them instead (maybe it should be called toggle-favourites-button)
    const showFavouritesButton = document.getElementById('show-favourites-button');
    showFavouritesButton.textContent = 'Hide Favourites';
    showFavouritesButton.onclick = hideFavouritesList;
    // hide the 'load more' button when favourites are showing
    loadMoreButton.style.display = 'none';
}
// Favourites aren't displayed by default, so the button shows them
document.getElementById('show-favourites-button').onclick = showFavouritesList;

// Hide favourites and restore the search results
function hideFavouritesList() {
    document.querySelector('#result-content h2').textContent = 'Results'
    const showFavouritesButton = document.getElementById('show-favourites-button');
    showFavouritesButton.textContent = 'Show Favourites';
    showFavouritesButton.onclick = showFavouritesList;

    if (parsedParams.source === 'googlebooks') {
        buildListFromRawDataGoogleBooks(0);
    } else {
        buildUlFromRawDataOpenLibrary(0);
    }
    // the 'load more' button is hidden when favourites are showing, this restores the previous status
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
