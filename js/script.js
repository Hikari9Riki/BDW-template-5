const gallery = document.querySelector('#memory-gallery');
const soundToggle = document.querySelector('#sound-toggle');
let lastCenteredMemory = null;
let audioContext;
let soundEnabled = false;

// Grab all hardcoded images
const memories = [...gallery.querySelectorAll('.memory')];
memories.forEach((card, index) => { card.dataset.memoryIndex = index; });

function playChime() {
  if (!soundEnabled || !audioContext) return;
  const now = audioContext.currentTime;
  [659.25, 783.99].forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, now + index * .055);
    gain.gain.setValueAtTime(.0001, now + index * .055);
    gain.gain.exponentialRampToValueAtTime(.075, now + index * .055 + .018);
    gain.gain.exponentialRampToValueAtTime(.0001, now + index * .055 + .55);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now + index * .055);
    oscillator.stop(now + index * .055 + .58);
  });
}

async function toggleSound() {
  audioContext ||= new AudioContext();
  if (audioContext.state === 'suspended') await audioContext.resume();
  soundEnabled = !soundEnabled;
  soundToggle.setAttribute('aria-pressed', String(soundEnabled));
  soundToggle.innerHTML = soundEnabled ? '<span aria-hidden="true">♫</span> Chime on' : '<span aria-hidden="true">♫</span> Tap for chime';
  if (soundEnabled) playChime();
}

function updateFocus() {
  const galleryBox = gallery.getBoundingClientRect();
  const middle = galleryBox.top + galleryBox.height / 2;
  let closestCard;
  let strongestFocus = 0;
  
  gallery.querySelectorAll('.memory').forEach((card) => {
    const box = card.getBoundingClientRect();
    const distance = Math.abs((box.top + box.height / 2) - middle);
    // Keep your original CSS variable math for the zoom effect
    const focus = Math.max(0, Math.min(1, 1 - distance / (galleryBox.height * .58)));
    card.style.setProperty('--focus', focus.toFixed(3));
    
    if (focus > strongestFocus) { 
      strongestFocus = focus; 
      closestCard = card; 
    }
  });
  
  if (closestCard && strongestFocus > .92) {
    const memoryId = closestCard.dataset.memoryIndex;
    if (memoryId !== lastCenteredMemory) { 
      lastCenteredMemory = memoryId; 
      playChime(); 
    }
  }
}

// Simplified event listeners without the glitchy teleporting guards
gallery.addEventListener('scroll', updateFocus, { passive: true });
soundToggle.addEventListener('click', toggleSound);
// Helper function to dynamically add padding so ends can reach the center
function setGalleryPadding() {
  if (!memories.length) return;
  // Calculate exactly how much empty space is needed
  const padding = (gallery.clientHeight - memories[0].clientHeight) / 2;
  gallery.style.paddingTop = `${padding}px`;
  gallery.style.paddingBottom = `${padding}px`;
}

// Update resize listener to recalculate if the user rotates their phone
window.addEventListener('resize', () => { 
  setGalleryPadding();
  updateFocus(); 
});

// Update load listener to start directly on Image 1
window.addEventListener('load', () => { 
  setGalleryPadding();
  
  // Start at the very top. Because of our new padding, 0 is perfectly centered on Image 1
  gallery.scrollTop = 0; 
  
  updateFocus(); 
}, { once: true });

// 1. Select the image viewer elements (Add viewerLetter to the list)
const imageViewer = document.querySelector('#image-viewer');
const viewerImage = document.querySelector('#viewer-image');
const viewerVideo = document.querySelector('#viewer-video');
const viewerLetter = document.querySelector('#viewer-letter'); // New text container
const viewerCaption = document.querySelector('#viewer-caption');
const viewerClose = document.querySelector('#viewer-close');

// Helper function to safely hide the viewer and reset all media
function closeViewer() {
  if (!imageViewer.hasAttribute('hidden')) {
    imageViewer.setAttribute('hidden', '');
    viewerVideo.pause();
    viewerVideo.removeAttribute('src');
    viewerImage.removeAttribute('src');
    viewerLetter.innerHTML = ''; // Clear the letter text
  }
}

// 2. Attach a click listener to every memory card
memories.forEach(card => {
  card.addEventListener('click', () => {
    const caption = card.querySelector('figcaption');
    const isLetter = card.dataset.type === 'letter';

    if (isLetter) {
      // It's a letter: grab the hidden text and show it in the viewer
      const letterContent = card.querySelector('.letter-content').innerHTML;
      viewerLetter.innerHTML = letterContent;
      
      viewerLetter.removeAttribute('hidden');
      viewerImage.setAttribute('hidden', '');
      viewerVideo.setAttribute('hidden', '');
      viewerVideo.pause();
      
    } else {
      // It's standard media: check if it's an image or video
      const media = card.querySelector('img, video');
      if (!media) return;

      if (media.tagName === 'VIDEO') {
        if (card.classList.contains('portrait-card')) {
          viewerVideo.classList.add('portrait-mode');
        } else {
          viewerVideo.classList.remove('portrait-mode');
        }
        viewerVideo.src = media.src;
        viewerVideo.removeAttribute('hidden');
        viewerImage.setAttribute('hidden', '');
        viewerLetter.setAttribute('hidden', '');
        viewerVideo.pause();
      } else {
        viewerImage.src = media.src;
        viewerImage.alt = media.alt || '';
        viewerImage.removeAttribute('hidden');
        viewerVideo.setAttribute('hidden', '');
        viewerLetter.setAttribute('hidden', '');
      }
    }

    viewerCaption.textContent = caption ? caption.textContent : '';
    imageViewer.removeAttribute('hidden');
    history.pushState({ viewerOpen: true }, '');
  });
});

// 3. When the user clicks the UI close button
viewerClose.addEventListener('click', () => {
  history.back(); 
});

// Click the dark background to close
imageViewer.addEventListener('click', (e) => {
  if (e.target === imageViewer) {
    history.back(); 
  }
});

// 4. Listen for the browser/device back button being pressed
window.addEventListener('popstate', () => {
  closeViewer();
});
