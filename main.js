import { makeAnimeCard } from "./makeAnimeCard.js";

const apiUrl = "https://api.jikan.moe/v4/top/anime";
const searchForm = document.querySelector("#search-form");
const searchInput = document.querySelector("#anime-search");
const genreFilter = document.querySelector("#genre-filter");
const resultsGrid = document.querySelector("#anime-grid");
const resultsTitle = document.querySelector("#results-title");
const resultCount = document.querySelector("#result-count");
const searchStatus = document.querySelector("#search-status");
const loadMoreButton = document.querySelector("#load-more");

let animeList = [];
let currentPage = 0;
let hasNextPage = true;
let isLoading = false;

function renderAnime(){
    const query = searchInput.value.trim().toLocaleLowerCase();
    const genreId = Number(genreFilter.value);
    const selectedGenre = genreFilter.selectedOptions[0].textContent;
    const filteredAnime = animeList.filter((anime) => {
        const matchesTitle = !query || [
            anime.title,
            anime.title_english,
            ...(anime.title_synonyms ?? [])
        ].some((title) => title?.toLocaleLowerCase().includes(query));
        const matchesGenre = !genreId || anime.genres?.some((genre) => genre.mal_id === genreId);
        return matchesTitle && matchesGenre;
    });

    resultsGrid.replaceChildren();
    for (const anime of filteredAnime){
        makeAnimeCard(anime);
    }

    resultsTitle.textContent = query
        ? `Results for “${searchInput.value.trim()}”`
        : genreId
            ? `${selectedGenre} anime`
            : "Popular anime";
    resultCount.textContent = `${filteredAnime.length} of ${animeList.length} loaded`;

    if (!isLoading){
        searchStatus.textContent = filteredAnime.length
            ? ""
            : "No matches in the loaded anime. Load more or try another search.";
    }
}

async function loadMoreAnime(){
    if (isLoading || !hasNextPage){
        return;
    }

    isLoading = true;
    loadMoreButton.disabled = true;
    loadMoreButton.textContent = "Loading…";
    searchStatus.textContent = "Loading more anime…";

    try {
        const response = await fetch(`${apiUrl}?page=${currentPage + 1}`);
        const result = await response.json();

        if (!response.ok){
            throw new Error(result.message ?? "The anime catalog is temporarily unavailable.");
        }

        animeList.push(...result.data);
        currentPage += 1;
        hasNextPage = result.pagination.has_next_page;
        renderAnime();
    } catch (error){
        searchStatus.textContent = `Could not load anime: ${error.message}`;
    } finally {
        isLoading = false;
        loadMoreButton.disabled = false;
        loadMoreButton.textContent = "Load more anime";
        loadMoreButton.hidden = !hasNextPage;
        if (searchStatus.textContent === "Loading more anime…"){
            searchStatus.textContent = resultsGrid.childElementCount
                ? ""
                : "No matches in the loaded anime. Load more or try another search.";
        }
    }
}

searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    renderAnime();
});

searchInput.addEventListener("input", renderAnime);
genreFilter.addEventListener("change", renderAnime);

searchForm.addEventListener("reset", (event) => {
    event.preventDefault();
    searchInput.value = "";
    genreFilter.value = "";
    renderAnime();
});

loadMoreButton.addEventListener("click", loadMoreAnime);

loadMoreAnime();
