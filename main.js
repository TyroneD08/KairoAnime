import { makeAnimeCard } from "./makeAnimeCard.js";

const apiUrl = "https://graphql.anilist.co";
const searchForm = document.querySelector("#search-form");
const searchInput = document.querySelector("#anime-search");
const genreFilter = document.querySelector("#genre-filter");
const resultsGrid = document.querySelector("#anime-grid");
const resultsTitle = document.querySelector("#results-title");
const resultCount = document.querySelector("#result-count");
const searchStatus = document.querySelector("#search-status");
const loadMoreButton = document.querySelector("#load-more");
const animeDialog = document.querySelector("#anime-dialog");
const animeDialogClose = document.querySelector("#anime-dialog-close");
const animeDialogImage = document.querySelector("#anime-dialog-image");
const animeDialogTitle = document.querySelector("#anime-dialog-title");
const animeDialogDescription = document.querySelector("#anime-dialog-description");
const animeDialogScore = document.querySelector("#anime-dialog-score");

let animeList = [];
let currentPage = 0;
let hasNextPage = true;
let isLoading = false;
let activeRequest = null;
let loadedGenre = genreFilter.value;
const seenGenreAnimeIds = new Set();

async function fetchAnimePage(page, genre, excludedIds, signal){
    const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
        },
        body: JSON.stringify({
            query: `
                query ($page: Int, $genres: [String], $excludeIds: [Int]) {
                    Page(page: $page, perPage: 25) {
                        pageInfo {
                            hasNextPage
                        }
                        media(type: ANIME, genre_in: $genres, id_not_in: $excludeIds, sort: SCORE_DESC) {
                            id
                            title {
                                romaji
                                english
                            }
                            synonyms
                            coverImage {
                                extraLarge
                                large
                            }
                            description
                            averageScore
                            genres
                        }
                    }
                }
            `,
            variables: {
                page,
                genres: genre ? [genre] : null,
                excludeIds: genre ? excludedIds : []
            }
        }),
        signal
    });
    const result = await response.json();

    if (!response.ok){
        throw new Error(result.errors?.map((error) => error.message).join("; ")
            ?? result.message
            ?? "The anime catalog is temporarily unavailable.");
    }

    if (result.errors?.length){
        throw new Error(result.errors.map((error) => error.message).join("; "));
    }

    const pageData = result.data?.Page;
    if (!pageData){
        throw new Error("AniList returned an unexpected response.");
    }

    return {
        data: pageData.media.map((anime) => {
            const descriptionText = (anime.description ?? "")
                .replace(/<br\s*\/?>/gi, "\n")
                .replace(/<\/p>/gi, "\n\n")
                .replace(/<[^>]*>/g, "");
            const descriptionDecoder = document.createElement("textarea");
            descriptionDecoder.innerHTML = descriptionText;

            return {
                id: anime.id,
                title: anime.title.english || anime.title.romaji || "Untitled",
                title_english: anime.title.english,
                title_synonyms: anime.synonyms,
                images: {
                    webp: {
                        large_image_url: anime.coverImage?.extraLarge ?? anime.coverImage?.large ?? ""
                    }
                },
                synopsis: descriptionDecoder.value.trim() || null,
                score: anime.averageScore === null || anime.averageScore === undefined
                    ? null
                    : (anime.averageScore / 10).toFixed(1),
                genres: anime.genres
            };
        }),
        hasNextPage: pageData.pageInfo.hasNextPage
    };
}

function renderAnime(){
    const query = searchInput.value.trim().toLocaleLowerCase();
    const selectedGenreValue = genreFilter.value;
    const selectedGenre = genreFilter.selectedOptions[0].textContent;
    const filteredAnime = animeList.filter((anime) => {
        const matchesTitle = !query || [
            anime.title,
            anime.title_english,
            ...(anime.title_synonyms ?? [])
        ].some((title) => title?.toLocaleLowerCase().includes(query));
        const matchesGenre = !selectedGenreValue || anime.genres?.includes(selectedGenreValue);
        return matchesTitle && matchesGenre;
    });

    resultsGrid.replaceChildren();
    for (const anime of filteredAnime){
        makeAnimeCard(anime);
    }

    resultsTitle.textContent = query
        ? `Results for “${searchInput.value.trim()}”`
        : selectedGenreValue
            ? `${selectedGenre} anime`
            : "Top Picks";
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

    const requestController = new AbortController();
    activeRequest = requestController;
    isLoading = true;
    loadMoreButton.disabled = true;
    loadMoreButton.textContent = "Loading…";
    searchStatus.textContent = "Loading more anime…";

    try {
        const result = await fetchAnimePage(
            currentPage + 1,
            genreFilter.value,
            [...seenGenreAnimeIds],
            requestController.signal
        );

        animeList.push(...result.data);
        currentPage += 1;
        hasNextPage = result.hasNextPage;
        renderAnime();
    } catch (error){
        if (error.name !== "AbortError" && activeRequest === requestController){
            searchStatus.textContent = `Could not load anime: ${error.message}`;
        }
    } finally {
        if (activeRequest === requestController){
            activeRequest = null;
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
}

function reloadAnime(){
    activeRequest?.abort();
    activeRequest = null;
    if (loadedGenre){
        for (const anime of animeList){
            seenGenreAnimeIds.add(anime.id);
        }
    }
    loadedGenre = genreFilter.value;
    isLoading = false;
    currentPage = 0;
    hasNextPage = true;
    animeList = [];
    loadMoreButton.hidden = false;
    renderAnime();
    loadMoreAnime();
}

searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    renderAnime();
});

searchInput.addEventListener("input", renderAnime);
genreFilter.addEventListener("change", reloadAnime);

searchForm.addEventListener("reset", (event) => {
    event.preventDefault();
    searchInput.value = "";
    genreFilter.value = "";
    reloadAnime();
});

loadMoreButton.addEventListener("click", loadMoreAnime);

function openAnimeDialog(card){
    const image = card.querySelector(".anime__card-img");
    animeDialogImage.src = image.src;
    animeDialogImage.alt = image.alt;
    animeDialogTitle.textContent = card.querySelector(".anime__card-title").textContent;
    animeDialogDescription.textContent = card.querySelector(".anime__card-resume").textContent;
    animeDialogScore.textContent = card.querySelector(".anime__card-score").textContent;
    animeDialog.showModal();
}

resultsGrid.addEventListener("click", (event) => {
    const card = event.target.closest(".anime__card");
    if (card){
        openAnimeDialog(card);
    }
});

resultsGrid.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " "){
        return;
    }

    const card = event.target.closest(".anime__card");
    if (card){
        event.preventDefault();
        openAnimeDialog(card);
    }
});

animeDialogClose.addEventListener("click", () => animeDialog.close());

animeDialog.addEventListener("click", (event) => {
    if (event.target === animeDialog){
        animeDialog.close();
    }
});

loadMoreAnime();
