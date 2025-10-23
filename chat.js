document.addEventListener('DOMContentLoaded', () => {
    const chatWindow = document.getElementById('chat-window');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const modelSelector = document.getElementById('model-selector');
    const modelSelectorBtn = document.getElementById('model-selector-btn');
    const currentModelName = document.getElementById('current-model-name');
    const modelList = document.getElementById('model-list');
    const resetChatBtn = document.getElementById('reset-chat-btn');
    const customConfirmModal = document.getElementById('custom-confirm-modal');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');
    const modalCancelBtn = document = document.getElementById('modal-cancel-btn');

    let selectedModel = 'sky'; 
    let chatHistory = [];

    loadHistory();
    initializeModelSelector();

    chatForm.addEventListener('submit', handleFormSubmit);
    resetChatBtn.addEventListener('click', () => {
        customConfirmModal.classList.remove('is-hidden');
    });

    modalCancelBtn.addEventListener('click', () => {
        customConfirmModal.classList.add('is-hidden');
    });

    modalConfirmBtn.addEventListener('click', () => {
        chatHistory = [];
        localStorage.removeItem('lipzxAiChatHistory');
        chatWindow.innerHTML = '';
        renderMessage({ sender: 'ai', content: 'Hello! Please select a model and send a message.', type: 'text' });
        customConfirmModal.classList.add('is-hidden');
    });

    function initializeModelSelector() {
        modelSelectorBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            modelSelector.classList.toggle('is-open');
        });
        
        modelList.addEventListener('click', (e) => {
            if (e.target.classList.contains('model-item')) {
                selectedModel = e.target.dataset.model;
                currentModelName.textContent = e.target.textContent;
                modelSelector.classList.remove('is-open');
            }
        });

        document.addEventListener('click', () => {
            if (modelSelector.classList.contains('is-open')) {
                modelSelector.classList.remove('is-open');
            }
        });
    }

    async function handleFormSubmit(e) {
    e.preventDefault();
    const userMessage = chatInput.value.trim();
    if (!userMessage) return;

    addMessageToHistory(userMessage, 'user', 'text');
    renderMessage({ sender: 'user', content: userMessage, type: 'text' });
    chatInput.value = '';
    showLoadingIndicator();

    const imageKeywords = ['gambar', 'foto', 'buatkan gambar', 'buatkan foto', 'draw', 'create image', 'generate image', 'make a image', 'picture'];
    const waifuKeywords = ['waifu', 'anime', 'random', 'anime random'];
    const nekoKeywords = ['neko', 'catgirl', 'kucing anime'];
    const nsfwKeywords = ['nsfw', 'hentai', 'ecchi'];
    const musicKeywords = ['play', 'mainkan', 'putar', 'lagu', 'musik', 'music']; // <-- Keywords baru untuk Lagu

    const isImageRequest = imageKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));
    const isWaifuRequest = waifuKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));
    const isNekoRequest = nekoKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));
    const isNsfwRequest = nsfwKeywords.some(keyword => userMessage.toLowerCase().includes(keyword));
    const isMusicRequest = musicKeywords.some(keyword => userMessage.toLowerCase().includes(keyword.split(' ')[0])); // <-- Pengecekan baru untuk Lagu

    // Logika diperbarui untuk mendahulukan Music
    if (isMusicRequest) {
        // Ambil query lagu setelah keyword (misal: "play lagu alamak")
        const musicQuery = userMessage.toLowerCase().replace(/^(play|mainkan|putar|lagu|musik|music)\s+/i, '').trim();
        if (musicQuery) {
            await playMusic(musicQuery);
        } else {
            handleError('Mohon berikan judul lagu atau artis yang ingin diputar.');
            removeLoadingIndicator();
        }
    } else if (isNsfwRequest) {
        await generateRandomNsfw();
    } else if (isNekoRequest) {
        await generateRandomNeko();
    } else if (isWaifuRequest) {
        await generateRandomWaifu();
    } else if (isImageRequest) {
        await generateImage(userMessage);
    } else {
        await fetchAIResponse(userMessage, selectedModel);
    }
}
    
    function cleanText(text) {
        // Hapus simbol-simbol yang tidak diinginkan
        return text.replace(/[^a-zA-Z0-9.,!?'"()\s]/g, '').trim();
    }

    async function fetchAIResponse(prompt, model, isRetry = false) {
        let url = '';
        const encodedPrompt = encodeURIComponent(prompt);

        switch (model) {
            case 'sky':
                url = `https://etzy-api.vercel.app/ai/special/sky?text=${encodedPrompt}`;
                break;
            case 'perplexity':
                url = `https://etzy-api.vercel.app/ai/perplexity?q=${encodedPrompt}`;
                break;
            case 'pollinations':
                url = `https://etzy-api.vercel.app/ai/pollinations?q=${encodedPrompt}&model=gpt-4.1`;
                break;
            case 'venice':
                url = `https://etzy-api.vercel.app/ai/venice?text=${encodedPrompt}`;
                break;
            default:
                handleError('Model tidak valid. Silakan pilih model lain.');
                removeLoadingIndicator();
                return;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`API returned status ${response.status}`);
            
            const data = await response.json();
            let aiText = data.response || data.result || (typeof data === 'string' ? data : JSON.stringify(data, null, 2));

            if (!aiText || aiText.trim() === '') {
                throw new Error('API returned an empty response.');
            }

            // Bersihkan teks jika model adalah "perplexity"
            if (model === 'perplexity') {
                aiText = cleanText(aiText);
            }

            addMessageToHistory(aiText, 'ai', 'text');
            renderMessage({ sender: 'ai', content: aiText, type: 'text' });
            removeLoadingIndicator();

        } catch (error) {
            console.error(`API Error for [${model.toUpperCase()}]:`, error.message);
            
            if (!isRetry) {
                console.log('Retrying with a fallback model...');
                await fetchAIResponse(prompt, 'sky', true); 
            } else {
                handleError('Maaf, semua model AI kami sedang sibuk. Coba lagi nanti.');
                removeLoadingIndicator();
            }
        }
    }

    async function generateImage(prompt) {
        const nsfwKeywords = [
            'nsfw', 'telanjang', 'bugil', 'nude', 'naked', 'sex', 'seks', 'porn', 'porno',
            'hentai', 'gore', 'darah', 'kekerasan', 'violence', 'sadis', 'explicit', 'r18', '18+', 'buatkan gambar telanjang'
        ];
        const isNsfwRequest = nsfwKeywords.some(keyword => prompt.toLowerCase().includes(keyword));
        const encodedPrompt = encodeURIComponent(prompt);
        let imageUrl;

        if (isNsfwRequest) {
            imageUrl = `https://flowfalcon.dpdns.org/ai/kivotos?prompt=${encodedPrompt}`;
        } else {
            imageUrl = `https://api.siputzx.my.id/api/ai/flux?prompt=${encodedPrompt}`;
        }
        
        try {
            const response = await fetch(imageUrl);
            if (!response.ok) throw new Error('Image could not be generated.');
            
            const imageBlob = await response.blob();
            const localImageUrl = URL.createObjectURL(imageBlob);

            addMessageToHistory(localImageUrl, 'ai', 'image');
            renderMessage({ sender: 'ai', content: localImageUrl, type: 'image' });

        } catch (error) {
            console.error('Image Generation Error:', error);
            handleError('Sorry, I failed to create the image. The service might be down.');
        } finally {
            removeLoadingIndicator();
        }
    }

    async function generateRandomWaifu() {
    // URL API telah diganti sesuai permintaan
    const waifuApiUrl = 'https://api.siputzx.my.id/api/r/waifu';
    try {
        const response = await fetch(waifuApiUrl);
        if (!response.ok) {
            throw new Error(`Gagal mengambil data, status: ${response.status}`);
        }

        // Karena API ini me-redirect, kita bisa langsung mengambil URL final dari respons.
        // Ini lebih sederhana dan efisien daripada membaca JSON.
        const imageUrl = response.url;

        addMessageToHistory(imageUrl, 'ai', 'image');
        renderMessage({ sender: 'ai', content: imageUrl, type: 'image' });

    } catch (error) {
        console.error('Random Waifu Generation Error:', error);
        handleError('Maaf, gagal mendapatkan gambar waifu random. API mungkin sedang bermasalah.');
    } finally {
        removeLoadingIndicator();
    }
    }

    async function generateRandomNeko() {
    // URL API baru untuk neko
    const nekoApiUrl = 'https://api.siputzx.my.id/api/r/neko';
    try {
        const response = await fetch(nekoApiUrl);
        if (!response.ok) {
            throw new Error(`Gagal mengambil data, status: ${response.status}`);
        }

        // Sama seperti waifu, API ini langsung redirect ke gambar
        const imageUrl = response.url;

        addMessageToHistory(imageUrl, 'ai', 'image');
        renderMessage({ sender: 'ai', content: imageUrl, type: 'image' });

    } catch (error) {
        console.error('Random Neko Generation Error:', error);
        handleError('Maaf, gagal mendapatkan gambar neko random. API mungkin sedang bermasalah.');
    } finally {
        removeLoadingIndicator();
    }
    }

    async function generateRandomNsfw() {
    // URL API baru untuk NSFW
    const nsfwApiUrl = 'https://etzy-api.vercel.app/random/nsfw';
    try {
        const response = await fetch(nsfwApiUrl);
        if (!response.ok) {
            throw new Error(`Gagal mengambil data, status: ${response.status}`);
        }

        // API ini juga redirect langsung ke gambar
        const imageUrl = response.url;

        addMessageToHistory(imageUrl, 'ai', 'image');
        renderMessage({ sender: 'ai', content: imageUrl, type: 'image' });

    } catch (error) {
        console.error('Random NSFW Generation Error:', error);
        handleError('Maaf, gagal mendapatkan gambar NSFW random. API mungkin sedang bermasalah.');
    } finally {
        removeLoadingIndicator();
    }
    }

    async function playMusic(query) {
    const encodedQuery = encodeURIComponent(query);
    const musicApiUrl = `https://etzy-api.vercel.app/downloader/ytplay?q=${encodedQuery}`;
    try {
        const response = await fetch(musicApiUrl);
        if (!response.ok) {
            throw new Error(`Gagal mengambil data lagu, status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success || !data.result || !data.result.downloadUrl || !data.result.metadata) {
            throw new Error('Tidak dapat menemukan lagu yang cocok atau format respons API tidak valid.');
        }

        const metadata = data.result.metadata;
        const audioUrl = data.result.downloadUrl;

        // Objek konten yang akan disimpan di histori dan dirender
        const audioContent = {
            title: metadata.title,
            audioUrl: audioUrl,
            videoUrl: metadata.url,
            coverUrl: metadata.cover, // <-- BARIS INI DITAMBAHKAN
            downloadUrl: audioUrl
        };

        addMessageToHistory(audioContent, 'ai', 'audio');
        renderMessage({ sender: 'ai', content: audioContent, type: 'audio' });

    } catch (error) {
        console.error('Play Music Error:', error);
        handleError(`Maaf, gagal memutar lagu: ${error.message || 'Terjadi kesalahan tidak dikenal.'}`);
    } finally {
        removeLoadingIndicator();
    }
    }

    function renderMessage(message) {
    const messageWrapper = document.createElement('div');
    messageWrapper.className = `chat-message ${message.sender}-message`;

    if (message.type === 'image') {
        const imageWrapper = document.createElement('div');
        imageWrapper.className = 'image-wrapper';

        const image = document.createElement('img');
        image.src = message.content;
        image.className = 'message-image';
        
        const downloadBtn = document.createElement('a');
        downloadBtn.href = message.content;
        downloadBtn.download = `nozva-ai-image-${Date.now()}.png`;
        downloadBtn.className = 'download-btn';
        downloadBtn.innerHTML = '<i class="fa-solid fa-download"></i>';
        
        imageWrapper.appendChild(image);
        imageWrapper.appendChild(downloadBtn);
        messageWrapper.appendChild(imageWrapper);
    } else if (message.type === 'audio') { // <-- GANTI SELURUH BLOK INI
    const audioContainer = document.createElement('div');
    audioContainer.className = 'audio-player-container';

    // BARU: Elemen untuk Thumbnail
    if (message.content.coverUrl) {
        const thumbnailElement = document.createElement('img');
        thumbnailElement.src = message.content.coverUrl;
        thumbnailElement.className = 'audio-thumbnail';
        audioContainer.appendChild(thumbnailElement);
    }
    
    // Wrapper untuk kontrol agar rapi
    const controlsWrapper = document.createElement('div');
    controlsWrapper.className = 'audio-controls-wrapper';

    // Judul Lagu
    const titleElement = document.createElement('p');
    titleElement.className = 'audio-title';
    titleElement.textContent = `${message.content.title}`;
    controlsWrapper.appendChild(titleElement);

    // Elemen Audio Player
    const audioElement = document.createElement('audio');
    audioElement.controls = true;
    audioElement.src = message.content.audioUrl;
    audioElement.type = 'audio/mpeg';
    controlsWrapper.appendChild(audioElement);

    // Wrapper untuk tombol-tombol
    const buttonsWrapper = document.createElement('div');
    buttonsWrapper.className = 'audio-buttons-wrapper';

    // Tombol Download
    if (message.content.downloadUrl) {
        const downloadButton = document.createElement('a');
        downloadButton.href = message.content.downloadUrl;
        // Menyarankan nama file yang lebih deskriptif
        downloadButton.download = `${message.content.title.replace(/[^a-z0-9\-]/gi, '_')}.mp3`;
        downloadButton.className = 'download-music-btn'; // Class baru untuk styling
        downloadButton.innerHTML = '<i class="fa-solid fa-download"></i> Download';
        buttonsWrapper.appendChild(downloadButton);
    }
    
    controlsWrapper.appendChild(buttonsWrapper);
    audioContainer.appendChild(controlsWrapper);
    messageWrapper.appendChild(audioContainer);

    } else {
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // Check for code blocks
        const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/;
        const match = message.content.match(codeBlockRegex);

        if (match && message.sender === 'ai') {
            // Text before the code block
            const beforeText = message.content.substring(0, match.index).trim();
            if (beforeText) {
                const p = document.createElement('p');
                p.innerHTML = beforeText;
                contentDiv.appendChild(p);
            }

            const lang = match[1] || 'plaintext';
            const code = match[2].trim();
            
            const codeContainer = document.createElement('div');
            codeContainer.className = 'code-block-container';

            const header = document.createElement('div');
            header.className = 'code-block-header';
            
            const langSpan = document.createElement('span');
            langSpan.textContent = lang;
            
            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-code-btn';
            copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Salin';
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(code).then(() => {
                    copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Tersalin!';
                    setTimeout(() => {
                        copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i> Salin';
                    }, 2000);
                });
            };
            
            header.appendChild(langSpan);
            header.appendChild(copyBtn);
            
            const pre = document.createElement('pre');
            const codeEl = document.createElement('code');
            codeEl.className = `language-${lang}`;
            codeEl.textContent = code;
            
            pre.appendChild(codeEl);
            codeContainer.appendChild(header);
            codeContainer.appendChild(pre);
            contentDiv.appendChild(codeContainer);

            // Highlight the code
            if (typeof hljs !== 'undefined') {
                hljs.highlightElement(codeEl);
            }

            // Text after the code block
            const afterText = message.content.substring(match.index + match[0].length).trim();
            if (afterText) {
                const p = document.createElement('p');
                p.innerHTML = afterText;
                contentDiv.appendChild(p);
            }

        } else {
            // No code block, just render the text
            contentDiv.innerHTML = message.content;
        }
        
        messageWrapper.appendChild(contentDiv);
    }
    chatWindow.appendChild(messageWrapper);
    scrollToBottom();
}
    
    function handleError(errorMessage) {
        addMessageToHistory(errorMessage, 'error', 'text');
        renderMessage({ sender: 'error', content: errorMessage, type: 'text' });
    }

    function showLoadingIndicator() {
        if (document.getElementById('loading-indicator')) return;
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'loading-indicator';
        loadingDiv.className = 'chat-message ai-message';
        loadingDiv.innerHTML = `<div class="message-content loading-dots">Thinking</div>`;
        chatWindow.appendChild(loadingDiv);
        scrollToBottom();
    }

    function removeLoadingIndicator() {
        const loadingIndicator = document.getElementById('loading-indicator');
        if (loadingIndicator) loadingIndicator.remove();
    }

    function scrollToBottom() {
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    function addMessageToHistory(content, sender, type) {
        chatHistory.push({ content, sender, type });
        saveHistory();
    }

    function saveHistory() {
        localStorage.setItem('lipzxAiChatHistory', JSON.stringify(chatHistory));
    }

    function loadHistory() {
        const savedHistory = localStorage.getItem('lipzxAiChatHistory');
        chatWindow.innerHTML = '';
        if (savedHistory) {
            chatHistory = JSON.parse(savedHistory);
            chatHistory.forEach(message => renderMessage(message));
            if (chatHistory.length === 0) {
                renderMessage({sender: 'ai', content: 'Hello! What can I do for you today?', type: 'text'});
            }
        } else {
            renderMessage({sender: 'ai', content: 'Hello! Please select a model and send a message.', type: 'text'});
        }
    }
});