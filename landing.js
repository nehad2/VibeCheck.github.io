const list  = document.getElementById("lastPlayedList");
const empty = document.getElementById("lastPlayedEmpty");

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60)           return "just now";
  if (diff < 3600)         return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)        return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const history = JSON.parse(localStorage.getItem("vibeCheckHistory") || "[]");

if (history.length === 0) {
  empty.classList.remove("hidden");
} else {
  history.forEach(song => {
    const li = document.createElement("li");
    li.className = "sidebar-item";
    li.innerHTML = `
      <img class="sidebar-item__art" src="${song.art}" alt="art" />
      <div style="min-width:0;flex:1">
        <p class="sidebar-item__track" title="${song.track}">${song.track}</p>
        <p class="sidebar-item__artist">${song.artist}</p>
      </div>
      ${song.timestamp ? `<span class="sidebar-item__time">${timeAgo(song.timestamp)}</span>` : ""}
    `;
    list.appendChild(li);
  });
}

// Page fade-in
document.body.style.opacity = "0";
document.body.style.transition = "opacity 0.3s ease";
window.addEventListener("load", () => { document.body.style.opacity = "1"; });

// Fade out on GO
document.querySelector(".go-btn").addEventListener("click", function(e) {
  e.preventDefault();
  const href = this.getAttribute("href");
  document.body.style.opacity = "0";
  setTimeout(() => { window.location.href = href; }, 280);
});
