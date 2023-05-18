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
});

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
    let fetchQuery = '';
    if (searchType === 'author') {
        fetchQuery = "inauthor:" + searchQuery;
    } else {
        fetchQuery = searchQuery;
    }

    fetch(`https://www.googleapis.com/books/v1/volumes?q=${fetchQuery}`)
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
            });
            listEl.addEventListener('click', function (event) {
                const listItem = event.target.closest('li');
                const rawItemId = listItem?.dataset.rawItemId;
                if (rawItemId) {
                    const rawItem = listItemRawData.get(rawItemId);
                    buildDetailsPaneGoogleBooks(rawItem);
                }
            });
            document.getElementById('result-content').replaceChildren(listEl);
        });
}

function fetchFromOpenLibrary(searchQuery, searchType) {
    let fetchQuery = '';
    if (searchType === 'author') {
        fetchQuery = `author=${searchQuery}`;
    } else {
        fetchQuery = `q=${searchQuery}`;
    }
    console.log(`fetchQuery = ${fetchQuery}`);

    fetch(`https://openlibrary.org/search.json?${fetchQuery}&limit=10`)
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
                let description = '';
                if (doc.subject) {
                    description = `Subjects: ${doc.subject.join(', ')}`;
                }
                const imageUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
                const listItem = buildListItem(title, author, description, imageUrl);
                listItem.dataset.rawItemId = doc.key;
                listItemRawData.set(doc.key, doc);
                listEl.append(listItem);
            });

            listEl.addEventListener('click', function (event) {
                const listItem = event.target.closest('li');
                const rawItemId = listItem?.dataset.rawItemId;
                if (rawItemId) {
                    const rawItem = listItemRawData.get(rawItemId);
                    buildDetailsPaneOpenLibrary(rawItem);
                }
            });

            document.getElementById('result-content').replaceChildren(listEl);
        });
}

function buildListItem(title, author, description, imageUrl) {
    const listItem = document.createElement('li');

    const thumbnailImg = document.createElement('img');
    thumbnailImg.src = imageUrl;
    listItem.appendChild(thumbnailImg);

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

    document.getElementById('details-box').replaceChildren(titleEl, subtitleEl, authorEl, imageEl, descriptionEl, publishDateEl, purchaseEl);
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

    document.getElementById('details-box').replaceChildren(titleEl, subtitleEl, authorEl, descriptionEl, firstPublishDateEl, otherSitesListEl);
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
  
  document.addEventListener('click', function(event) {
    const listItem = event.target.closest('li');
    const rawItemId = listItem?.dataset.rawItemId;
    if (rawItemId) {
      const rawItem = listItemRawData.get(rawItemId);
      if (searchSource === 'googlebooks') {
        buildDetailsPaneGoogleBooks(rawItem);
      } else if (searchSource === 'openlibrary') {
        buildDetailsPaneOpenLibrary(rawItem);
      }
      openModal();
    }
  });
  
  document.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal-close') || event.target.classList.contains('modal-background')) {
      closeModal();
    }
  });