const listItemRawData = [];

// the search params, provided by index.html
let unparsedParams = document.location.search;
if (unparsedParams.startsWith('?')) {
    // remove leading '?'
    unparsedParams = unparsedParams.slice(1);
}
unparsedParams = unparsedParams.split('&');
let parsedParams = {};
unparsedParams.forEach(pair => {
    const [key, value] = pair.split('=');
    parsedParams[key] = value;
})

if (!parsedParams.type) {
    throw new Error(`Missing search type: ${JSON.stringify(parsedParams)}`);
} else if (!parsedParams.q) {
    throw new Error(`Missing search term: ${JSON.stringify(parsedParams)}`);
}
const searchSource = parsedParams.source || 'googlebooks';
switch (searchSource) {
    case 'googlebooks':
        fetchFromGoogleBooks(parsedParams.q, parsedParams.type);
        break;
    case 'openlibrary':
        fetchFromOpenLibrary(parsedParams.q, parsedParams.type);
        break;
}

function fetchFromGoogleBooks(searchQuery, searchType) {
    let fetchQuery = "";
    if (searchType == 'author') {
        fetchQuery = "inauthor:" + searchQuery;
    } else {
        fetchQuery = searchQuery;
    }
    
    fetch(`https://www.googleapis.com/books/v1/volumes?q=${fetchQuery}`)    // to fetch more, use startIndex=...
    .then(result => {
        if (!result.ok) {
            throw new Error(`Fetch failed: ${result}`);
        }
        return result.json();
    })
    .then(data => {
        const listEl = document.createElement('ul');

        // construct the list items
        data.items.forEach(item => {
            const title = item.volumeInfo.title;
            const author = item.volumeInfo.authors?.join(', ') || '';
            const description = item.volumeInfo.description;
            let imageUrl = item.volumeInfo.imageLinks?.thumbnail;
            if (!imageUrl) {
                imageUrl = item.volumeInfo.imageLinks?.smallThumbnail;
            }
            const listItem = buildListItem(title, author, description, imageUrl);
            listItem.dataset.listIndex = listItemRawData.length;
            listItemRawData.push(item);
            listEl.append(listItem);
        });
        // add a 'click' event listener to the whole li to display detailed data
        listEl.addEventListener('click', function(event) {
            const listItem = event.target.closest('li');
            const listIndex = listItem?.dataset.listIndex;
            if (listIndex != undefined && listIndex != null) {
                const rawItem = listItemRawData[listIndex];
                buildDetailsPaneGoogleBooks(rawItem);
            }
        });

        document.getElementById('result-content').replaceChildren(listEl);
    })
}

function fetchFromOpenLibrary(searchQuery, searchType) {
    let fetchQuery = '';
    if (searchType == 'author') {
        fetchQuery = `author=${searchQuery}`;
    } else {
        fetchQuery = `q=${searchQuery}`;
    }

    fetch(`https://openlibrary.org/search.json?${fetchQuery}&limit=10`)     // to fetch more, use offset=...
    .then(result => {
        if (!result.ok) {
            throw new Error(`Fetch failed: ${result}`);
        }
        return result.json();
    })
    .then(data => {
        const listEl = document.createElement('ul');

        // build the list items
        data.docs.forEach(doc => {
            const title = doc.title;
            const author = doc.author_name?.join(', ') || '';
            let description = '';
            if (doc.subject) {
                description = `Subjects: ${doc.subject.join(', ')}`;
            }
            const imageUrl = '';
            const listItemEl = buildListItem(title, author, description, imageUrl);
            listItemEl.dataset.listIndex = listItemRawData.length;
            listItemRawData.push(doc);
            listEl.append(listItemEl);
        });
        // add a 'click' event listener to display more details
        listEl.addEventListener('click', function(event) {
            const listItem = event.target.closest('li');
            const listIndex = listItem?.dataset.listIndex;
            if (listIndex != undefined && listIndex != null) {
                const rawItem = listItemRawData[listIndex];
                buildDetailsPaneOpenLibrary(rawItem);
            }
        })
        document.getElementById('result-content').replaceChildren(listEl);
    })
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

    detailsEl.append(summaryEl, imageEl, descriptionEl)
    liEl.append(detailsEl);
    return liEl;
}

function buildDetailsPaneGoogleBooks(item) {
    // extract details from the raw item
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

    // build DOM elements for the details
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

    document.getElementById('details-box').replaceChildren(titleEl, subtitleEl, authorEl, imageEl, descriptionEl, publishDateEl, purchaseEl);
}

function buildDetailsPaneOpenLibrary(doc) {
    // extract details from the raw item
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

    // build DOM elements for each detail
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

    document.getElementById('details-box').replaceChildren(titleEl, subtitleEl, authorEl, descriptionEl, firstPublishDateEl, otherSitesListEl);
}