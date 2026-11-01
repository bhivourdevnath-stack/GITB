// Directory search and filters reload through Flask query parameters.

document.querySelectorAll(".main-nav a").forEach((link) => {
    link.addEventListener("pointerenter", (event) => {
        const bounds = link.getBoundingClientRect();
        link.style.setProperty("--nav-origin-x", `${event.clientX - bounds.left}px`);
        link.style.setProperty("--nav-origin-y", `${event.clientY - bounds.top}px`);
    });

    link.addEventListener("pointermove", (event) => {
        const bounds = link.getBoundingClientRect();
        link.style.setProperty("--nav-origin-x", `${event.clientX - bounds.left}px`);
        link.style.setProperty("--nav-origin-y", `${event.clientY - bounds.top}px`);
    });
});

document.querySelectorAll(".text-roll").forEach((element) => {
    const text = element.textContent.trim().replace(/\s+/g, " ");
    if (!text) return;

    element.setAttribute("aria-label", text);
    element.tabIndex = 0;
    element.textContent = "";

    text.split(" ").forEach((word, wordIndex, words) => {
        const wordElement = document.createElement("span");
        wordElement.className = "text-roll-word";

        [...word].forEach((character, index) => {
            const characterElement = document.createElement("span");
            characterElement.className = "text-roll-character";

            const characterOffset = [...word].length === 1 ? 0 : (index - ([...word].length - 1) / 2);
            characterElement.style.setProperty("--roll-delay", `${Math.abs(characterOffset) * 35}ms`);
            characterElement.setAttribute("aria-hidden", "true");

            const current = document.createElement("span");
            current.className = "text-roll-current";
            current.textContent = character;

            const next = document.createElement("span");
            next.className = "text-roll-next";
            next.textContent = character;

            characterElement.append(current, next);
            wordElement.appendChild(characterElement);
        });

        element.appendChild(wordElement);
        if (wordIndex < words.length - 1) {
            const space = document.createElement("span");
            space.className = "text-roll-space";
            space.setAttribute("aria-hidden", "true");
            element.appendChild(space);
        }
    });
});

const pixelCanvas = document.createElement("canvas");
pixelCanvas.className = "pixel-stars";
pixelCanvas.setAttribute("aria-hidden", "true");
document.body.prepend(pixelCanvas);

const pixelContext = pixelCanvas.getContext("2d");
const starColors = ["#FFFFFF", "#FFFFAA", "#AAAAFF", "#FFAAAA", "#AAFFAA", "#FFAAFF", "#AAFFFF"];
let backgroundStars = [];
let shootingStars = [];
let nebulaPointer = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 };
let clickedStars = [];

const createBackgroundStars = () => {
    const pixelSize = 5;
    const count = Math.max(20, Math.floor(window.innerWidth * window.innerHeight * 0.00004));
    backgroundStars = Array.from({ length: count }, () => {
        const opacity = Math.random() * 0.5 + 0.5;
        return {
            x: Math.floor(Math.random() * (window.innerWidth / pixelSize)) * pixelSize,
            y: Math.floor(Math.random() * (window.innerHeight / pixelSize)) * pixelSize,
            color: starColors[Math.floor(Math.random() * starColors.length)],
            opacity,
            currentOpacity: opacity,
            twinkle: Math.random() < 0.7,
            direction: 1,
            timer: Math.random() * 4,
            speed: 2 + Math.random() * 3,
            size: Math.random() < 0.12 ? 8 : Math.random() < 0.25 ? 3 : 5
        };
    });
};

const regenerateWhiteStars = () => {
    const count = Math.max(1, Math.floor(backgroundStars.length * 0.15));

    for (let index = 0; index < count; index += 1) {
        const starIndex = Math.floor(Math.random() * backgroundStars.length);
        const star = backgroundStars[starIndex];
        if (!star || star.color !== "#FFFFFF") continue;

        star.x = Math.floor(Math.random() * (window.innerWidth / 5)) * 5;
        star.y = Math.floor(Math.random() * (window.innerHeight / 5)) * 5;
        star.opacity = Math.random() * 0.5 + 0.5;
        star.currentOpacity = star.opacity;
        star.timer = Math.random() * 4;
        star.speed = 2 + Math.random() * 2;
        star.size = Math.random() < 0.12 ? 8 : Math.random() < 0.25 ? 3 : 5;
    }
};

const resizePixelCanvas = () => {
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    pixelCanvas.width = Math.floor(window.innerWidth * scale);
    pixelCanvas.height = Math.floor(window.innerHeight * scale);
    if (pixelContext) pixelContext.setTransform(scale, 0, 0, scale, 0, 0);
    createBackgroundStars();
};

const createShootingStar = () => {
    shootingStars.push({
        x: Math.random() * window.innerWidth,
        y: -6,
        angle: 45 + Math.random() * 90,
        speed: 8 + Math.random() * 5,
        trail: []
    });
};

const scheduleRandomShootingStar = () => {
    createShootingStar();
    window.setTimeout(scheduleRandomShootingStar, 2000 + Math.random() * 4000);
};

const animatePixelStars = () => {
    if (!pixelContext) return;
    pixelContext.clearRect(0, 0, window.innerWidth, window.innerHeight);

    const hero = document.querySelector(".hero-section");
    const heroBounds = hero ? hero.getBoundingClientRect() : null;
    const step = 12;
    const nebulaX = nebulaPointer.x;
    const nebulaY = nebulaPointer.y;
    if (heroBounds) {
    for (let y = heroBounds.top; y < heroBounds.bottom; y += step) {
        for (let x = heroBounds.left; x < heroBounds.right; x += step) {
            const distanceFromPointer = Math.hypot(x - nebulaX, y - nebulaY);
            const nebulaWave = Math.sin(x * 0.007 + y * 0.011) * 55;
            const gasDistance = Math.hypot(x - (heroBounds.left + heroBounds.width * 0.62), y - (heroBounds.top + heroBounds.height * 0.43 + nebulaWave));
            if (gasDistance > 260) continue;

            const intensity = 1 - gasDistance / 260;
            const pointerLight = Math.max(0, 1 - distanceFromPointer / 180);
            pixelContext.fillStyle = pointerLight > 0
                ? `rgba(255, 178, 200, ${0.12 + pointerLight * 0.22})`
                : `rgba(255, 31, 90, ${intensity * 0.22})`;
            pixelContext.fillRect(x, y, pointerLight > 0 ? 3 : 2, pointerLight > 0 ? 3 : 2);
        }
    }
    }

    clickedStars.forEach((star) => {
        pixelContext.fillStyle = "#FFFFFF";
        pixelContext.globalAlpha = Math.max(0.35, star.opacity);
        pixelContext.fillRect(star.x, star.y, 3, 3);
        pixelContext.fillRect(star.x + 6, star.y, 1, 1);
        pixelContext.fillRect(star.x, star.y + 6, 1, 1);
        star.opacity *= 0.985;
    });

    backgroundStars.forEach((star) => {
        if (star.twinkle) {
            star.timer += 0.0625;
            if (star.timer >= star.speed) {
                star.timer = 0;
                star.direction *= -1;
            }
            const progress = star.timer / star.speed;
            star.currentOpacity = progress < 0.5
                ? (star.direction > 0 ? star.opacity : star.opacity * 0.3)
                : (star.direction > 0 ? star.opacity * 0.3 : star.opacity);
        }

        pixelContext.fillStyle = star.color;
        pixelContext.globalAlpha = star.currentOpacity;
        pixelContext.fillRect(star.x, star.y, star.size, star.size);
    });

    shootingStars.forEach((star) => {
        const angle = star.angle * Math.PI / 180;
        star.x += star.speed * Math.cos(angle);
        star.y += star.speed * Math.sin(angle);
        star.trail.unshift({ x: star.x, y: star.y });
        star.trail = star.trail.slice(0, 7);

        star.trail.forEach((point, index) => {
            pixelContext.fillStyle = "#AAFFFF";
            pixelContext.globalAlpha = (star.trail.length - index) / star.trail.length;
            pixelContext.fillRect(point.x, point.y, 2, 2);
        });

        pixelContext.globalAlpha = 1;
        pixelContext.fillStyle = "#FFFFFF";
        pixelContext.fillRect(star.x, star.y, 2, 2);
        pixelContext.fillRect(star.x + 2, star.y, 2, 2);
        pixelContext.fillRect(star.x + 4, star.y, 2, 2);
        pixelContext.fillRect(star.x + 2, star.y + 2, 2, 2);
    });

    shootingStars = shootingStars.filter((star) =>
        star.x > -30 && star.x < window.innerWidth + 30 &&
        star.y > -30 && star.y < window.innerHeight + 30
    );
    pixelContext.globalAlpha = 1;
    window.requestAnimationFrame(animatePixelStars);
};

window.addEventListener("pointermove", (event) => {
    nebulaPointer = { x: event.clientX, y: event.clientY };
}, { passive: true });

window.addEventListener("pointerdown", (event) => {
    if (event.target instanceof Element && event.target.closest("a, button, input")) return;
    clickedStars.push({ x: event.clientX, y: event.clientY, opacity: 1 });
    clickedStars = clickedStars.slice(-12);
});

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    resizePixelCanvas();
    window.addEventListener("resize", resizePixelCanvas);
    scheduleRandomShootingStar();
    window.setInterval(regenerateWhiteStars, 5000);
    window.requestAnimationFrame(animatePixelStars);
} else {
    resizePixelCanvas();
    backgroundStars.forEach((star) => {
        pixelContext.globalAlpha = star.opacity;
        pixelContext.fillStyle = star.color;
        pixelContext.fillRect(star.x, star.y, star.size, star.size);
    });
    pixelContext.globalAlpha = 1;
}

document.querySelectorAll(".directory-card-grid, .game-grid").forEach((grid) => {
    const cards = [...grid.querySelectorAll(".directory-game-card, .game-card")];
    if (!cards.length) return;

    const activateCard = (card) => {
        cards.forEach((item) => item.classList.toggle("is-expanded", item === card));
        grid.classList.add("has-expanded-card");
    };

    const clearCard = () => {
        cards.forEach((item) => item.classList.remove("is-expanded"));
        grid.classList.remove("has-expanded-card");
    };

    cards.forEach((card) => {
        card.addEventListener("pointerenter", () => activateCard(card));
        card.addEventListener("focus", () => activateCard(card));
    });

    grid.addEventListener("pointerleave", clearCard);
    grid.addEventListener("focusout", (event) => {
        if (!grid.contains(event.relatedTarget)) clearCard();
    });
});

// Soft spring-follow cursor for fine-pointer devices.
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

if (finePointer.matches && !reducedMotion.matches) {
    const cursor = document.createElement("div");
    cursor.className = "mouse-cursor";
    cursor.innerHTML = '<span class="mouse-cursor-dot" aria-hidden="true"></span><span class="mouse-cursor-ring" aria-hidden="true"></span>';
    document.body.appendChild(cursor);
    document.documentElement.classList.add("has-mouse-cursor");

    const dot = cursor.querySelector(".mouse-cursor-dot");
    const ring = cursor.querySelector(".mouse-cursor-ring");
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let dotX = targetX;
    let dotY = targetY;
    let ringX = targetX;
    let ringY = targetY;

    window.addEventListener("pointermove", (event) => {
        targetX = event.clientX;
        targetY = event.clientY;
        cursor.classList.add("is-visible");
    }, { passive: true });

    document.documentElement.addEventListener("pointerleave", () => {
        cursor.classList.remove("is-visible");
    });

    document.addEventListener("pointerover", (event) => {
        const interactive = event.target.closest("a, button, input, [role='button']");
        cursor.classList.toggle("is-hovering", Boolean(interactive));
    });

    const animateCursor = () => {
        dotX += (targetX - dotX) * 0.65;
        dotY += (targetY - dotY) * 0.65;
        ringX += (targetX - ringX) * 0.16;
        ringY += (targetY - ringY) * 0.16;

        dot.style.transform = `translate3d(${dotX}px, ${dotY}px, 0)`;
        ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
        window.requestAnimationFrame(animateCursor);
    };

    animateCursor();
}
