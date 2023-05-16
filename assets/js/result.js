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

let query = "";
if (parsedParams.q == 'author') {
    query = "inauthor:" + parsedParams.q;
} else {
    query = parsedParams.q;
}

fetch(`https://www.googleapis.com/books/v1/volumes?q=${query}`)
.then(result => {
    console.log(result);
    if (!result.ok) {
        throw new Error(`Fetch failed: ${result}`);
    }
    return result.json();
})
.then(data => {
    console.log(data);
    const listEl = document.createElement('ul');
    data.items.forEach(item => {
        const liEl = document.createElement('li');
        const detailsEl = document.createElement('details');

        const summaryEl = document.createElement('summary');
        summaryEl.innerHTML = `<strong>${item.volumeInfo.title}</strong> ${item.volumeInfo.authors?.join(', ') || ''}`;
        const descriptionEl = document.createElement('p');
        descriptionEl.textContent = item.volumeInfo.description;

        let imageUrl = item.volumeInfo.imageLinks?.thumbnail;
        if (!imageUrl) {
            imageUrl = item.volumeInfo.imageLinks?.smallThumbnail;
        }
        let imageEl = '';
        if (imageUrl) {
            imageEl = document.createElement('img');
            imageEl.src = imageUrl;
        }

        detailsEl.append(summaryEl, imageEl, descriptionEl)
        liEl.append(detailsEl);
        listEl.append(liEl);
    })

    document.getElementById('result-content').replaceChildren(listEl);
})