const listItemRawData = new Map();

let unparsedParams = document.location.search;
if (unparsedParams.startsWith('?')) {
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
        data.items.forEach(item => {
            const title = item.volumeInfo.title;
            const author = item.volumeInfo.authors?.join(', ') || '';
            const description = item.volumeInfo.description;
            let imageUrl = item.volumeInfo.imageLinks?.thumbnail;
            if (!imageUrl) {
                imageUrl = item.volumeInfo.imageLinks?.smallThumbnail;
            }
            const listItem = buildListItem(title, author, description, imageUrl);
            listItem.dataset.rawItemId = item.id;
            listItemRawData.set(item.id, item);
            listEl.append(listItem);
        })
        listEl.addEventListener('click', function(event) {
            const listItem = event.target.closest('li');
            const rawItemId = listItem?.dataset.rawItemId;
            if (rawItemId) {
                const rawItem = listItemRawData.get(rawItemId)
                buildDetailsPaneGoogleBooks(rawItem);
            }
        })
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
    console.log(`fetchQuery = ${fetchQuery}`);

    fetch(`https://openlibrary.org/search.json?${fetchQuery}&limit=10`)     // to fetch more, use offset=...
    .then(result => {
        console.log(result);
        if (!result.ok) {
            throw new Error(`Fetch failed: ${result}`);
        }
        return result.json();
    })
    .then(data => {
        const listEl = document.createElement('ul');

        data.docs.forEach(doc => {
            const title = doc.title;
            const author = doc.author_name?.join(', ') || '';
            const description = '';
            const imageUrl = '';
            const listItemEl = buildListItem(title, author, description, imageUrl);
            listItemEl.dataset.rawItem = doc;
            listEl.append(listItemEl);
        });
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

    document.getElementById('details-box').replaceChildren(titleEl, subtitleEl, authorEl, imageEl, descriptionEl, publishDateEl, purchaseEl);
}