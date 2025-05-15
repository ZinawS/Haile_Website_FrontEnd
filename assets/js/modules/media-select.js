document.addEventListener("DOMContentLoaded", () => {
  // Configuration
  const config = {
    YOUTUBE_API_KEY: "YOUR_YOUTUBE_API_KEY",
    CHANNEL_ID: "YOUR_YOUTUBE_CHANNEL_ID",
    TIKTOK_CLIENT_KEY: "awztu4cqi0u3sju2",
    TIKTOK_CLIENT_SECRET: "coTJQGH08SgYXAeLh62pFzUhJufc8LpL",
  };

  // DOM Elements
  const select = document.getElementById("media-select");
  const mediaGrid = document.getElementById("media-grid");
  const videoModal = document.getElementById("video-modal");
  const videoModalPlayer = document.getElementById("video-modal-player");
  const videoModalClose = document.getElementById("video-modal-close");

  // Constants
  const CACHE_DURATION = 60 * 60 * 1000; // 1 hour cache
  const PLACEHOLDER_IMAGE = "https://picsum.photos/280/158";
  const TIKTOK_TOKEN_KEY = "tiktok_access_token";
  const TIKTOK_TOKEN_EXPIRY = "tiktok_token_expiry";
  const YOUTUBE_DEFAULT_THUMBNAIL =
    "https://i.ytimg.com/vi/default/hqdefault.jpg";

  // Initialize Select2 if available
  if (typeof $ !== "undefined" && $.fn.select2) {
    $(select).select2({
      minimumResultsForSearch: Infinity,
      width: "100%",
    });
  }

  // Local Fallback Data
  const mediaData = {
    youtube: [
      {
        url: "https://youtu.be/6LQaMIEVYMI",
        title: "የዶክተር አለማየሁ ዋሴ አስደናቂ የሕወት ምልከታ",
      },
      {
        url: "https://youtu.be/ximA2zFndlY",
        title: "የሰው ደም የነካው መሬት ዘር አያበቅልም",
      },
      {
        url: "https://youtu.be/2zbM1XW2ql0?si=xKwJNpAAkuWLG499",
        title: "በአዲስ አበባ ላይ የተጋረጠው አደጋ",
      },
      {
        url: "https://youtu.be/saEEsejoMoo",
        title: "የፀሐይ ከተማ እንዴት ትመለስ?",
      },
    ],
    tiktok: [
      {
        url: "https://www.tiktok.com/@melkahiwot/video/7392411616882576682",
        title: "TikTok Video 1: Orthodoxy Insights",
      },
      {
        url: "https://www.tiktok.com/@melkahiwot/video/987654321",
        title: "TikTok Video 2: Life Design Tips",
      },
      {
        url: "https://www.tiktok.com/@melkahiwot/video/456789123",
        title: "TikTok Video 3: Spiritual Growth",
      },
      {
        url: "https://www.tiktok.com/@melkahiwot/video/789123456",
        title: "TikTok Video 4: Quick Inspiration",
      },
    ],
    podcasts: [
      {
        url: "https://example.com/podcasts/episode1.mp3",
        title: "Podcast Episode 1: Exploring Orthodoxy",
      },
      {
        url: "https://example.com/podcasts/episode2.mp3",
        title: "Podcast Episode 2: Life Design Principles",
      },
      {
        url: "https://example.com/podcasts/episode3.mp3",
        title: "Podcast Episode 3: Spiritual Balance",
      },
      {
        url: "https://example.com/podcasts/episode4.mp3",
        title: "Podcast Episode 4: Human Existence",
      },
    ],
    lectures: [
      {
        url: "https://example.com/lectures/lecture1.mp4",
        title: "Lecture 1: Foundations of Orthodoxy",
      },
      {
        url: "https://example.com/lectures/lecture2.mp4",
        title: "Lecture 2: Designing Your Life",
      },
      {
        url: "https://example.com/lectures/lecture3.mp4",
        title: "Lecture 3: Spiritual Innovation",
      },
      {
        url: "https://example.com/lectures/lecture4.mp4",
        title: "Lecture 4: Human Systems",
      },
    ],
  };

  // Helper Functions
  const extractVideoId = (url) => {
    const youtubeRegExp =
      /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const tiktokRegExp = /tiktok\.com\/@[^\/]+\/video\/(\d+)/i;
    return (
      url.match(youtubeRegExp)?.[1] || url.match(tiktokRegExp)?.[1] || null
    );
  };

  const getYouTubeThumbnail = (videoId) => {
    return videoId
      ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      : YOUTUBE_DEFAULT_THUMBNAIL;
  };

  const getTikTokThumbnail = (videoId) => {
    return videoId
      ? `https://p16-sign.tiktokcdn-us.com/tos-useast5-p-0068-tx/${videoId}.webp?x-expires=1697059200`
      : PLACEHOLDER_IMAGE;
  };

  const formatViews = (count) => {
    if (!count) return "";
    return Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(count);
  };

  // Cache Management
  const getCachedMedia = (type) => {
    const cached = localStorage.getItem(`${type}_media`);
    const timestamp = localStorage.getItem(`${type}_media_time`);
    if (cached && timestamp && Date.now() - timestamp < CACHE_DURATION) {
      return JSON.parse(cached);
    }
    return null;
  };

  const cacheMedia = (data, type) => {
    localStorage.setItem(`${type}_media`, JSON.stringify(data));
    localStorage.setItem(`${type}_media_time`, Date.now());
  };

  // Token Management
  const getTikTokToken = async () => {
    const storedToken = localStorage.getItem(TIKTOK_TOKEN_KEY);
    const storedExpiry = localStorage.getItem(TIKTOK_TOKEN_EXPIRY);

    if (storedToken && storedExpiry && Date.now() < parseInt(storedExpiry)) {
      return storedToken;
    }

    try {
      const response = await fetch(
        "https://open.tiktokapis.com/v2/oauth/token/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_key: config.TIKTOK_CLIENT_KEY,
            client_secret: config.TIKTOK_CLIENT_SECRET,
            grant_type: "client_credentials",
          }),
        }
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const { access_token, expires_in } = data;
      const expiryTime = Date.now() + expires_in * 1000 - 60000;

      localStorage.setItem(TIKTOK_TOKEN_KEY, access_token);
      localStorage.setItem(TIKTOK_TOKEN_EXPIRY, expiryTime.toString());

      return access_token;
    } catch (error) {
      console.error("TikTok token error:", error);
      return null;
    }
  };

  // API Fetch Functions
  const fetchYouTubeVideos = async () => {
    const cachedData = getCachedMedia("youtube");
    if (cachedData) return cachedData;

    if (!config.YOUTUBE_API_KEY || !config.CHANNEL_ID) {
      console.warn("Missing YouTube API config");
      return null;
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?key=${config.YOUTUBE_API_KEY}&channelId=${config.CHANNEL_ID}&part=snippet,id&order=date&maxResults=4`
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      const videos =
        data.items?.map((item) => ({
          id: item.id?.videoId,
          title: item.snippet?.title,
          url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
          thumbnail: item.snippet?.thumbnails?.medium?.url,
          views: item.statistics?.viewCount,
        })) || [];

      cacheMedia(videos, "youtube");
      return videos;
    } catch (error) {
      console.error("YouTube API error:", error);
      return null;
    }
  };

  const fetchTikTokVideos = async () => {
    const cachedData = getCachedMedia("tiktok");
    if (cachedData) return cachedData;

    const token = await getTikTokToken();
    if (!token) {
      console.warn("Failed to get TikTok token");
      return null;
    }

    try {
      const response = await fetch(
        "https://open.tiktokapis.com/v2/video/list/",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fields: ["id", "title", "cover_image_url", "share_count"],
          }),
        }
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const result = await response.json();
      const videos =
        result.data?.videos?.map((video) => ({
          id: video.id,
          title: video.title,
          url: `https://www.tiktok.com/@melkahiwot/video/${video.id}`,
          thumbnail: video.cover_image_url,
          views: video.share_count,
        })) || [];

      cacheMedia(videos, "tiktok");
      return videos;
    } catch (error) {
      console.error("TikTok API error:", error);
      return null;
    }
  };

  // Media Rendering
  const createVideoCard = (item) => {
    const videoId = extractVideoId(item.url) || item.id;
    const isYouTube =
      item.url.includes("youtube.com") || item.url.includes("youtu.be");
    const isTikTok = item.url.includes("tiktok.com");

    let thumbnailUrl = item.thumbnail;
    if (!thumbnailUrl && videoId) {
      thumbnailUrl = isYouTube
        ? getYouTubeThumbnail(videoId)
        : isTikTok
          ? getTikTokThumbnail(videoId)
          : PLACEHOLDER_IMAGE;
    }

    return `
      <div class="video-card" data-video-id="${videoId || ""}" data-video-url="${item.url}">
        <div class="video-thumbnail-container">
          <img 
            src="${thumbnailUrl || PLACEHOLDER_IMAGE}" 
            alt="${item.title}" 
            class="video-thumbnail" 
            loading="lazy"
            onerror="this.src='${PLACEHOLDER_IMAGE}'"
          >
          <div class="video-overlay" onclick="playVideo('${videoId || ""}', '${item.url}')">
            <span class="play-icon">▶</span>
          </div>
        </div>
        <div class="video-info">
          <h3 class="video-title">${item.title}</h3>
          <div class="video-meta">
            <span>${item.views ? `${formatViews(item.views)} views` : ""}</span>
          </div>
        </div>
      </div>
    `;
  };
  // console.log(createVideoCard);
  const renderMedia = async (type) => {
    mediaGrid.innerHTML = '<div class="loading-spinner">Loading...</div>';

    try {
      let data = [];

      // Try API first
      if (type === "youtube") {
        data = await fetchYouTubeVideos();
      } else if (type === "tiktok") {
        data = await fetchTikTokVideos();
      } else {
        data = mediaData[type] || [];
      }

      // Fallback to local data if API fails or no data
      if (!data || !data.length) {
        console.warn(`Using local ${type} data`);
        data = mediaData[type] || [];
      }

      if (!data.length) {
        mediaGrid.innerHTML = `<p class="video-error">No ${type} content available.</p>`;
        return;
      }

      mediaGrid.innerHTML = data.map((item) => createVideoCard(item)).join("");
    } catch (error) {
      console.error(`Error rendering ${type}:`, error);
      mediaGrid.innerHTML = `<p class="video-error">Failed to load ${type} content. Please try again later.</p>`;
    }
  };

  // Video Playback
  window.playVideo = (videoId, url) => {
    let embedHtml = "";
    const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
    const isTikTok = url.includes("tiktok.com");
    const isPodcast = url.endsWith(".mp3");
    const isLecture = url.endsWith(".mp4");

    if (isYouTube && videoId) {
      embedHtml = `
        <iframe 
          src="https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0" 
          frameborder="0" 
          allowfullscreen
        ></iframe>
      `;
    } else if (isTikTok) {
      embedHtml = `
        <blockquote class="tiktok-embed" cite="${url}" data-video-id="${videoId}">
          <section></section>
        </blockquote>
      `;
    } else if (isPodcast) {
      embedHtml = `
        <audio controls autoplay style="width: 100%;">
          <source src="${url}" type="audio/mpeg">
          Your browser doesn't support audio
        </audio>
      `;
    } else if (isLecture) {
      embedHtml = `
        <video controls autoplay style="width: 100%;">
          <source src="${url}" type="video/mp4">
          Your browser doesn't support video
        </video>
      `;
    } else {
      embedHtml = `<p>Unsupported media: <a href="${url}" target="_blank">Open link</a></p>`;
    }

    videoModalPlayer.innerHTML = embedHtml;
    videoModal.style.display = "block";
    document.body.style.overflow = "hidden";

    if (
      isTikTok &&
      !document.querySelector('script[src="https://www.tiktok.com/embed.js"]')
    ) {
      const script = document.createElement("script");
      script.src = "https://www.tiktok.com/embed.js";
      script.async = true;
      document.body.appendChild(script);
    }
  };

  // Modal Controls
  videoModalClose.addEventListener("click", () => {
    videoModal.style.display = "none";
    document.body.style.overflow = "auto";
    videoModalPlayer.innerHTML = "";
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && videoModal.style.display === "block") {
      videoModalClose.click();
    }
  });

  // Event Handlers
  const handleMediaChange = () => {
    const type = select.value;
    renderMedia(type);
  };

  select.addEventListener("change", handleMediaChange);
  if (typeof $ !== "undefined" && $.fn.select2) {
    $(select).on("change", handleMediaChange);
  }

  // Initialize
  renderMedia("youtube");
});
