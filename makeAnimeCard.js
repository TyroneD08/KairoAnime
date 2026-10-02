export function makeAnimeCard(data){
    let cardEl = document.createElement("article");
    cardEl.className = "anime__card";
    cardEl.setAttribute("role", "button");
    cardEl.setAttribute("tabindex", "0");
    cardEl.setAttribute("aria-label", `Show full description for ${data.title}`);
    cardEl.setAttribute("aria-expanded", "false");

    let imgEl = document.createElement("img");
    imgEl.src = data.images?.webp?.large_image_url ?? data.images?.jpg?.image_url ?? "";
    imgEl.className = "anime__card-img";
    imgEl.alt = `${data.title} cover`;
    cardEl.appendChild(imgEl);

    let containerEl = document.createElement("div");
    containerEl.className = "anime__card-info";

    let titleEl = document.createElement("h2");
    titleEl.className = "anime__card-title";
    titleEl.innerText = data.title;
    containerEl.appendChild(titleEl);

    let resEl = document.createElement("p");
    resEl.className = "anime__card-resume";
    resEl.innerText = data.synopsis ?? "No synopsis available yet.";
    containerEl.appendChild(resEl);

    let scoreEl = document.createElement("div");
    scoreEl.className = "anime__card-score";
    scoreEl.innerText = `★ ${data.score ?? "N/A"}`;
    containerEl.appendChild(scoreEl);

    cardEl.appendChild(containerEl);

    let grid = document.querySelector("#anime-grid");
    grid.appendChild(cardEl);
}