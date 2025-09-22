class PortfolioManager {
    constructor() {
        this.isLoggedIn = false;
        // Authorized fingerprints - local and production versions
        this.authorizedFingerprints = ['YOUR_PRODUCTION_FINGERPRINT'];
        
        // Supabase configuration - add your actual values here
        this.supabaseUrl = 'YOUR_SUPABASE_URL'; // Replace with your Supabase project URL
        this.supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY'; // Replace with your anon public key
        this.supabaseServiceKey = 'YOUR_SUPABASE_SERVICE_KEY'; // Replace with your service role key
        this.supabase = null;
        
        this.init();
    }

    async init() {
        // Generate fingerprint first
        this.currentFingerprint = await this.generateFingerprint();

        // Uncomment to view your fingerprint in console
        // This is useful for debugging and ensuring your fingerprint matches the authorized list
        
        // console.log('Your fingerprint:', this.currentFingerprint);
        
        // Initialize Supabase if credentials are provided
        if (this.supabaseUrl.startsWith('https://') && this.supabaseAnonKey.startsWith('eyJ')) {
            this.supabase = supabase.createClient(this.supabaseUrl, this.supabaseAnonKey);
            
            if (this.supabaseServiceKey && this.supabaseServiceKey.startsWith('eyJ')) {
                this.supabaseAdmin = supabase.createClient(this.supabaseUrl, this.supabaseServiceKey);
            }
        }
        
        // Auto-login if authorized user
        if (this.authorizedFingerprints.includes(this.currentFingerprint)) {
            this.isLoggedIn = true;
        }
        
        this.data = await this.loadData();
        this.bindEvents();
        this.renderContent();
        this.updateUIBasedOnAuth();
    }

    async loadData() {
        // If Supabase is available, try to load from database
        if (this.supabase) {
            try {
                const { data, error } = await this.supabase
                    .from('portfolio_data')
                    .select('content')
                    .eq('data_type', 'main')
                    .order('updated_at', { ascending: false })
                    .limit(1);
                
                if (data && data.length > 0 && !error) {
                    return data[0].content;
                }
            } catch (error) {
                // Supabase error - fall through to localStorage
            }
        }
        
        // Fallback to localStorage
        const saved = localStorage.getItem('portfolioData');
        if (saved) {
            return JSON.parse(saved);
        }
        return {
            about: "",
            experiences: [],
            projects: [],
            profilePhoto: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f0f0f0'/%3E%3Ccircle cx='100' cy='80' r='30' fill='%23ccc'/%3E%3Cellipse cx='100' cy='160' rx='50' ry='30' fill='%23ccc'/%3E%3C/svg%3E",
            header: {
                name: "Taran Agarwal",
                socialLinks: {
                    github: "https://github.com/taranagarwal",
                    linkedin: "https://www.linkedin.com/in/agarwaltaran/"
                }
            },
            resume: null
        };
    }

    async saveData() {
        // Save to localStorage as backup
        localStorage.setItem('portfolioData', JSON.stringify(this.data));
        
        // Save to Supabase if available (admin only)
        if (this.supabaseAdmin) {
            try {
                const { error } = await this.supabaseAdmin
                    .from('portfolio_data')
                    .insert({
                        data_type: 'main',
                        content: this.data,
                        updated_at: new Date().toISOString()
                    });
                
                // Data saved successfully or handle error silently
            } catch (error) {
                // Handle error silently
            }
        }
    }

    bindEvents() {
        // Auth events
        document.getElementById('previewBtn').addEventListener('click', () => this.togglePreviewMode());

        // Edit events
        document.getElementById('editAboutBtn').addEventListener('click', () => this.editAbout());
        document.getElementById('editPhotoBtn').addEventListener('click', () => this.editPhoto());
        document.getElementById('editHeaderBtn').addEventListener('click', () => this.editHeader());
        document.getElementById('editSocialBtn').addEventListener('click', () => this.editSocialLinks());
        document.getElementById('addExperienceBtn').addEventListener('click', () => this.addExperience());
        document.getElementById('addProjectBtn').addEventListener('click', () => this.addProject());

        // Photo upload
        document.getElementById('photoInput').addEventListener('change', (e) => this.handlePhotoUpload(e));
        
        // Logo upload
        document.getElementById('logoInput').addEventListener('change', (e) => this.handleExpLogoUpload(e));

        // Resume upload
        document.getElementById('resumeInput').addEventListener('change', (e) => this.handleResumeUpload(e));

        // Resume link click
        document.getElementById('resumeLink').addEventListener('click', (e) => this.openResume(e));

        // Image editor events
        document.getElementById('zoomSlider').addEventListener('input', () => this.updateCanvas());
        document.getElementById('moveX').addEventListener('input', () => this.updateCanvas());
        document.getElementById('moveY').addEventListener('input', () => this.updateCanvas());
        document.getElementById('resetPosition').addEventListener('click', () => this.resetImageEditor());
        document.getElementById('savePhoto').addEventListener('click', () => this.saveEditedImage());

        // Modal events
        document.querySelectorAll('.close').forEach(close => {
            close.addEventListener('click', () => this.closeModals());
        });

        // Add escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModals();
            }
        });

        // Add formatting keyboard shortcuts to textareas
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'TEXTAREA' && (e.target.id === 'expDescription' || e.target.id === 'projectDescription')) {
                this.handleTextareaFormatting(e);
            }
        });
    }

    handleTextareaFormatting(e) {
        // Check for Command key on Mac (metaKey) or Control key on Windows (ctrlKey)
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const modifierKey = isMac ? e.metaKey : e.ctrlKey;
        
        if (!modifierKey) return;
        
        const textarea = e.target;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        
        let replacement = '';
        let newStart = start;
        let newEnd = end;
        
        if (e.key === 'b' || e.key === 'B') {
            e.preventDefault();
            const result = this.toggleFormatting(textarea.value, start, end, '**', '**');
            replacement = result.replacement;
            newStart = result.newStart;
            newEnd = result.newEnd;
        } else if (e.key === 'i' || e.key === 'I') {
            e.preventDefault();
            const result = this.toggleFormatting(textarea.value, start, end, '*', '*');
            replacement = result.replacement;
            newStart = result.newStart;
            newEnd = result.newEnd;
        } else if (e.key === 'k' || e.key === 'K') {
            e.preventDefault();
            // Check if Shift is held for links, otherwise code
            if (e.shiftKey) {
                // Create a link [text](url)
                const selectedText = textarea.value.substring(start, end);
                if (selectedText) {
                    replacement = `[${selectedText}](url)`;
                    newStart = start;
                    newEnd = start + replacement.length;
                } else {
                    replacement = '[text](url)';
                    newStart = start;
                    newEnd = start + replacement.length;
                }
            } else {
                const result = this.toggleFormatting(textarea.value, start, end, '`', '`');
                replacement = result.replacement;
                newStart = result.newStart;
                newEnd = result.newEnd;
            }
        } else if (e.key === 's' || e.key === 'S') {
            e.preventDefault();
            const result = this.toggleFormatting(textarea.value, start, end, '~~', '~~');
            replacement = result.replacement;
            newStart = result.newStart;
            newEnd = result.newEnd;
        } else if ((e.key === '1' || e.key === '2' || e.key === '3' || e.key === '4' || e.key === '5' || e.key === '6') && e.shiftKey) {
            e.preventDefault();
            // Add header
            const level = parseInt(e.key);
            const headerPrefix = '#'.repeat(level) + ' ';
            const selectedText = textarea.value.substring(start, end);
            
            // Check if we're at the beginning of a line or add newline
            const beforeText = textarea.value.substring(0, start);
            const needsNewline = beforeText.length > 0 && !beforeText.endsWith('\n');
            
            replacement = (needsNewline ? '\n' : '') + headerPrefix + (selectedText || 'Header text');
            newStart = start;
            newEnd = start + replacement.length;
        } else if (e.key === 'q' || e.key === 'Q') {
            e.preventDefault();
            // Add blockquote
            const selectedText = textarea.value.substring(start, end);
            const beforeText = textarea.value.substring(0, start);
            const needsNewline = beforeText.length > 0 && !beforeText.endsWith('\n');
            
            replacement = (needsNewline ? '\n' : '') + '> ' + (selectedText || 'Quote text');
            newStart = start;
            newEnd = start + replacement.length;
        } else if (e.key === 'l' || e.key === 'L') {
            e.preventDefault();
            // Add list item
            const selectedText = textarea.value.substring(start, end);
            const beforeText = textarea.value.substring(0, start);
            const needsNewline = beforeText.length > 0 && !beforeText.endsWith('\n');
            
            if (e.shiftKey) {
                // Ordered list
                replacement = (needsNewline ? '\n' : '') + '1. ' + (selectedText || 'List item');
            } else {
                // Unordered list
                replacement = (needsNewline ? '\n' : '') + '- ' + (selectedText || 'List item');
            }
            newStart = start;
            newEnd = start + replacement.length;
        }
        
        if (replacement !== '') {
            // Replace the text
            const beforeSelection = textarea.value.substring(0, Math.min(newStart, start));
            const afterSelection = textarea.value.substring(Math.max(newEnd, end));
            textarea.value = beforeSelection + replacement + afterSelection;
            
            // Set cursor position
            if (replacement.includes('**') || replacement.includes('*') || replacement.includes('`') || replacement.includes('~~')) {
                // Check if this is empty formatting (like ****, **, ``, or ~~~~)
                if ((replacement === '****') || (replacement === '**') || (replacement === '``') || (replacement === '~~~~')) {
                    // Place cursor in the middle of empty formatting
                    const middlePos = beforeSelection.length + Math.floor(replacement.length / 2);
                    textarea.setSelectionRange(middlePos, middlePos);
                } else {
                    // If we added formatting to selected text, place cursor after the formatted text
                    const newCursorPos = beforeSelection.length + replacement.length;
                    textarea.setSelectionRange(newCursorPos, newCursorPos);
                }
            } else {
                // For other elements, place cursor at the end
                const newCursorPos = beforeSelection.length + replacement.length;
                textarea.setSelectionRange(newCursorPos, newCursorPos);
            }
        }
    }

    toggleFormatting(text, start, end, startDelim, endDelim) {
        const selectedText = text.substring(start, end);
        
        // Check if we're inside formatted text by looking at surrounding characters
        const beforeStart = Math.max(0, start - startDelim.length);
        const afterEnd = Math.min(text.length, end + endDelim.length);
        
        // Check if selection already has the formatting
        if (selectedText.startsWith(startDelim) && selectedText.endsWith(endDelim)) {
            // Remove formatting from selected text
            const unformatted = selectedText.substring(startDelim.length, selectedText.length - endDelim.length);
            return {
                replacement: unformatted,
                newStart: start,
                newEnd: end
            };
        }
        
        // Check if selection is inside formatted text
        const beforeText = text.substring(beforeStart, start);
        const afterText = text.substring(end, afterEnd);
        
        if (beforeText.endsWith(startDelim) && afterText.startsWith(endDelim)) {
            // Remove surrounding formatting
            return {
                replacement: selectedText,
                newStart: beforeStart,
                newEnd: afterEnd
            };
        }
        
        // Add formatting
        if (selectedText) {
            return {
                replacement: `${startDelim}${selectedText}${endDelim}`,
                newStart: start,
                newEnd: end
            };
        } else {
            // No selection, add empty formatting
            const emptyFormatting = `${startDelim}${endDelim}`;
            return {
                replacement: emptyFormatting,
                newStart: start,
                newEnd: end
            };
        }
    }

    async generateFingerprint() {
        try {
            // Create stable canvas fingerprint (no timing)
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 200;
            canvas.height = 50;
            
            // Draw stable pattern
            ctx.fillStyle = 'rgb(102, 204, 0)';
            ctx.fillRect(0, 0, 200, 50);
            ctx.fillStyle = 'rgb(255, 0, 102)';
            ctx.font = '18px Arial';
            ctx.fillText('Unique Browser Test', 2, 20);
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'blue';
            ctx.fillRect(100, 5, 80, 40);
            
            // Get WebGL info (very browser/GPU specific)
            let webglInfo = 'no-webgl';
            try {
                const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                if (gl) {
                    const renderer = gl.getParameter(gl.RENDERER);
                    const vendor = gl.getParameter(gl.VENDOR);
                    webglInfo = `${vendor}-${renderer}`;
                }
            } catch(e) {}
            
            const fingerprint = {
                screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                language: navigator.language,
                platform: navigator.userAgentData?.platform || navigator.platform,
                userAgent: navigator.userAgent.slice(0, 100),
                canvas: canvas.toDataURL(),
                webgl: webglInfo,
                memory: navigator.deviceMemory || 'unknown',
                cores: navigator.hardwareConcurrency || 'unknown'
            };
            
            
            // Create stable hash
            const jsonStr = JSON.stringify(fingerprint);
            let hash = 0;
            for (let i = 0; i < jsonStr.length; i++) {
                const char = jsonStr.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            
            const result = hash.toString();
            return result;
        } catch (error) {
            return 'stable-fallback';
        }
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString();
    }

    formatUrl(url) {
        if (!url) return '';
        
        // If URL already has protocol, return as is
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }
        
        // If URL starts with www. or has a domain extension, add https://
        if (url.startsWith('www.') || /\.[a-z]{2,}($|\/)/.test(url)) {
            return `https://${url}`;
        }
        
        // Otherwise, assume it's a relative path and return as is
        return url;
    }

    truncateText(text, maxLength = 315) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    showReadMoreModal(title, fullDescription) {
        const formattedDescription = this.formatMarkdown(fullDescription);
        const modal = document.getElementById('editModal');
        const modalContent = modal.querySelector('.modal-content');
        
        // Add the read-more-modal class for larger size
        modalContent.classList.add('read-more-modal');
        
        modal.querySelector('h2').textContent = title;
        modal.querySelector('#editForm').innerHTML = `
            <div style="max-height: 70vh; overflow-y: auto; padding: 15px; font-size: 16px; line-height: 1.7;">
                ${formattedDescription}
            </div>
        `;
        modal.style.display = 'block';
        document.body.classList.add('modal-open');
        
        // Remove the class when modal closes to not affect other modals
        const closeModal = () => {
            modalContent.classList.remove('read-more-modal');
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
        };
        
        // Add event listeners for closing
        modal.querySelector('.close').onclick = closeModal;
        modal.onclick = (e) => {
            if (e.target === modal) closeModal();
        };
    }

    formatMarkdown(text, includeLineBreaks = true) {
        if (!text) return '';
        
        // First, handle code blocks (triple backticks) before other processing
        let formatted = text.replace(/```([^`]+?)```/gs, '{{CODEBLOCK_START}}$1{{CODEBLOCK_END}}');
        
        // Split into lines for line-by-line processing
        let lines = formatted.split('\n');
        let processedLines = [];
        let inList = false;
        let listType = null;
        
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            let originalLine = line;
            
            // Skip empty lines (but preserve them)
            if (line.trim() === '') {
                if (inList) {
                    processedLines.push('</ul>');
                    inList = false;
                    listType = null;
                }
                processedLines.push('');
                continue;
            }
            
            // Headers (# ## ### #### ######)
            const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
            if (headerMatch) {
                if (inList) {
                    processedLines.push('</ul>');
                    inList = false;
                    listType = null;
                }
                const level = headerMatch[1].length;
                const headerText = headerMatch[2];
                line = `<h${level}>${headerText}</h${level}>`;
            }
            
            // Blockquotes (> text)
            else if (line.match(/^>\s+/)) {
                if (inList) {
                    processedLines.push('</ul>');
                    inList = false;
                    listType = null;
                }
                line = line.replace(/^>\s+(.+)$/, '<blockquote>$1</blockquote>');
            }
            
            // Horizontal rules (--- or ***)
            else if (line.match(/^(---|\*\*\*)$/)) {
                if (inList) {
                    processedLines.push('</ul>');
                    inList = false;
                    listType = null;
                }
                line = '<hr>';
            }
            
            // Unordered lists (- item or * item)
            else if (line.match(/^[\s]*[-\*]\s+/)) {
                if (!inList) {
                    processedLines.push('<ul>');
                    inList = true;
                    listType = 'ul';
                }
                line = line.replace(/^[\s]*[-\*]\s+(.+)$/, '<li>$1</li>');
            }
            
            // Ordered lists (1. item)
            else if (line.match(/^[\s]*\d+\.\s+/)) {
                if (!inList || listType !== 'ol') {
                    if (inList && listType === 'ul') {
                        processedLines.push('</ul>');
                    }
                    processedLines.push('<ol>');
                    inList = true;
                    listType = 'ol';
                }
                line = line.replace(/^[\s]*\d+\.\s+(.+)$/, '<li>$1</li>');
            }
            
            // If not a list item and we were in a list, close it
            else if (inList) {
                processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
                inList = false;
                listType = null;
            }
            
            processedLines.push(line);
        }
        
        // Close any remaining open lists
        if (inList) {
            processedLines.push(listType === 'ul' ? '</ul>' : '</ol>');
        }
        
        // Join lines back together
        formatted = processedLines.join('\n');
        
        // Now handle inline formatting with placeholders to avoid conflicts
        formatted = formatted
            // Links [text](url)
            .replace(/\[([^\]]+?)\]\(([^)]+?)\)/g, '{{LINK_START}}$1{{LINK_MID}}$2{{LINK_END}}')
            // Code (single backticks)
            .replace(/`([^`]+?)`/g, '{{CODE_START}}$1{{CODE_END}}')
            // Strikethrough (~~text~~)
            .replace(/~~([^~]+?)~~/g, '{{STRIKE_START}}$1{{STRIKE_END}}')
            // Bold (**text**)
            .replace(/\*\*([^*]+?)\*\*/g, '{{BOLD_START}}$1{{BOLD_END}}')
            // Italic (*text*)
            .replace(/\*([^*]+?)\*/g, '{{ITALIC_START}}$1{{ITALIC_END}}')
            // Replace placeholders with HTML
            .replace(/\{\{LINK_START\}\}/g, '<a href="')
            .replace(/\{\{LINK_MID\}\}/g, '" target="_blank" rel="noopener noreferrer">')
            .replace(/\{\{LINK_END\}\}/g, '</a>')
            .replace(/\{\{CODEBLOCK_START\}\}/g, '<pre><code>')
            .replace(/\{\{CODEBLOCK_END\}\}/g, '</code></pre>')
            .replace(/\{\{CODE_START\}\}/g, '<code>')
            .replace(/\{\{CODE_END\}\}/g, '</code>')
            .replace(/\{\{STRIKE_START\}\}/g, '<del>')
            .replace(/\{\{STRIKE_END\}\}/g, '</del>')
            .replace(/\{\{BOLD_START\}\}/g, '<strong>')
            .replace(/\{\{BOLD_END\}\}/g, '</strong>')
            .replace(/\{\{ITALIC_START\}\}/g, '<em>')
            .replace(/\{\{ITALIC_END\}\}/g, '</em>');
        
        // Handle line breaks
        if (includeLineBreaks) {
            // Convert double newlines to paragraph breaks
            formatted = formatted
                .replace(/\n\s*\n/g, '</p><p>')
                .replace(/^/, '<p>')
                .replace(/$/, '</p>')
                // Clean up empty paragraphs
                .replace(/<p><\/p>/g, '')
                .replace(/<p>\s*<\/p>/g, '');
                
            // Convert single newlines to <br> within paragraphs (except around block elements)
            formatted = formatted.replace(/(?<!<\/(?:h[1-6]|blockquote|hr|ul|ol|li|pre)>)\n(?!<(?:h[1-6]|blockquote|hr|ul|ol|li|pre|\/p))/g, '<br>');
        } else {
            // For preview, replace newlines with spaces and strip block elements
            formatted = formatted
                .replace(/<\/?(?:h[1-6]|blockquote|hr|ul|ol|li|pre|p)[^>]*>/g, ' ')
                .replace(/\n/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        }
        
        return formatted;
    }

    togglePreviewMode() {
        if (this.authorizedFingerprints.includes(this.currentFingerprint)) {
            this.isLoggedIn = !this.isLoggedIn;
            this.updateUIBasedOnAuth();
            this.renderContent();
        }
    }

    updateUIBasedOnAuth() {
        const editElements = document.querySelectorAll('.edit-btn, .add-btn');
        const previewBtn = document.getElementById('previewBtn');

        // Only show preview button if user is authorized
        if (this.authorizedFingerprints.includes(this.currentFingerprint)) {
            previewBtn.style.display = 'inline-block';
            
            if (this.isLoggedIn) {
                editElements.forEach(el => el.style.display = 'inline-block');
                previewBtn.textContent = 'Preview Mode';
            } else {
                editElements.forEach(el => el.style.display = 'none');
                previewBtn.textContent = 'Edit Mode';
            }
        } else {
            previewBtn.style.display = 'none';
            editElements.forEach(el => el.style.display = 'none');
        }
    }

    renderContent() {
        // Render header
        this.renderHeader();
        
        // Render about section with markdown formatting
        const formattedAbout = this.formatMarkdown(this.data.about);
        document.getElementById('aboutText').innerHTML = formattedAbout;
        document.getElementById('profilePhoto').src = this.data.profilePhoto;

        // Render experiences
        this.renderExperiences();

        // Render projects
        this.renderProjects();
    }
    
    renderHeader() {
        // Update header name
        if (this.data.header && this.data.header.name) {
            document.getElementById('headerName').textContent = this.data.header.name;
            document.title = this.data.header.name; // Update page title too
        }
        
        // Update social links
        if (this.data.header && this.data.header.socialLinks) {
            if (this.data.header.socialLinks.github) {
                document.getElementById('githubLink').href = this.data.header.socialLinks.github;
            }
            if (this.data.header.socialLinks.linkedin) {
                document.getElementById('linkedinLink').href = this.data.header.socialLinks.linkedin;
            }
        }
        
        // Show/hide resume link based on whether resume is uploaded
        const resumeLink = document.getElementById('resumeLink');
        if (this.data.resume) {
            resumeLink.style.display = 'flex';
        } else {
            resumeLink.style.display = 'none';
        }
    }

    renderExperiences() {
        const container = document.getElementById('experiencesList');
        container.innerHTML = '';

        // Sort by order property (if exists) or chronologically
        const sortedExperiences = this.data.experiences.sort((a, b) => {
            if (a.order !== undefined && b.order !== undefined) {
                return a.order - b.order;
            }
            // Fallback to chronological sorting
            const getEndYear = (dateStr) => {
                if (dateStr.toLowerCase().includes('present')) {
                    return 9999;
                }
                const matches = dateStr.match(/(\d{4})/g);
                return matches ? parseInt(matches[matches.length - 1]) : 0;
            };
            return getEndYear(b.date) - getEndYear(a.date);
        });

        sortedExperiences.forEach((exp, index) => {
            const expElement = document.createElement('div');
            expElement.className = `experience-item ${!exp.description || exp.description.trim() === '' ? 'no-description' : ''}`;
            const hasDescription = exp.description && exp.description.trim() !== '';
            
            // Create truncated description for 1-line preview (shorter than projects since it's meant to be 1 line)
            const truncatedDescription = hasDescription ? this.formatMarkdown(this.truncateText(exp.description, 120), false) : '';
            const needsReadMore = hasDescription && exp.description.length > 120;
            
            expElement.innerHTML = `
                <div class="experience-header">
                    ${exp.logo ? `<img src="${exp.logo}" alt="${exp.company} logo" class="company-logo">` : ''}
                    <h3>${exp.company}</h3>
                </div>
                <h4>${exp.title}</h4>
                <p class="date">${exp.date}</p>
                ${hasDescription ? `
                    <div class="description-container">
                        <p>${truncatedDescription}${needsReadMore ? ` <span class="read-more" data-exp-id="${exp.id}" data-type="experience">Read more</span>` : ''}</p>
                    </div>
                ` : ''}
                ${this.isLoggedIn ? `
                    <div class="item-buttons">
                        <button class="reorder-btn" onclick="portfolio.moveExperience(${exp.id}, 'up')" ${index === 0 ? 'disabled' : ''}>↑</button>
                        <button class="reorder-btn" onclick="portfolio.moveExperience(${exp.id}, 'down')" ${index === sortedExperiences.length - 1 ? 'disabled' : ''}>↓</button>
                        <button class="edit-btn" onclick="portfolio.editExperience(${exp.id})">Edit</button>
                        <button class="delete-btn" onclick="portfolio.deleteExperience(${exp.id})">Delete</button>
                    </div>
                ` : ''}
            `;
            container.appendChild(expElement);
        });

        // Add event listeners for Read more buttons
        container.querySelectorAll('.read-more[data-type="experience"]').forEach(button => {
            button.addEventListener('click', () => {
                const expId = parseInt(button.getAttribute('data-exp-id'));
                const exp = this.data.experiences.find(e => e.id === expId);
                if (exp) {
                    this.showReadMoreModal(`${exp.company} - ${exp.title}`, exp.description);
                }
            });
        });
    }

    renderProjects() {
        const container = document.getElementById('projectsList');
        container.innerHTML = '';

        // Sort by order property (if exists) or keep original order
        const sortedProjects = this.data.projects.sort((a, b) => {
            if (a.order !== undefined && b.order !== undefined) {
                return a.order - b.order;
            }
            return 0; // Keep original order if no order property
        });

        sortedProjects.forEach((project, index) => {
            const projectElement = document.createElement('div');
            projectElement.className = 'project-item';
            const truncatedDescription = this.formatMarkdown(this.truncateText(project.description, 315), false);
            const needsReadMore = project.description && project.description.length > 315;
            
            projectElement.innerHTML = `
                <h3>${project.title} ${project.year ? `(${project.year})` : ''}</h3>
                <div class="description-container">
                    <p>${truncatedDescription}${needsReadMore ? ` <span class="read-more" data-project-id="${project.id}" data-type="project">Read more</span>` : ''}</p>
                </div>
                ${this.renderProjectLinks(project)}
                <div class="project-tech">
                    ${project.technologies.map(tech => `<span class="tech-tag">${tech}</span>`).join('')}
                </div>
                ${this.isLoggedIn ? `
                    <div class="item-buttons">
                        <button class="reorder-btn" onclick="portfolio.moveProject(${project.id}, 'up')" ${index === 0 ? 'disabled' : ''}>↑</button>
                        <button class="reorder-btn" onclick="portfolio.moveProject(${project.id}, 'down')" ${index === sortedProjects.length - 1 ? 'disabled' : ''}>↓</button>
                        <button class="edit-btn" onclick="portfolio.editProject(${project.id})">Edit</button>
                        <button class="delete-btn" onclick="portfolio.deleteProject(${project.id})">Delete</button>
                    </div>
                ` : ''}
            `;
            container.appendChild(projectElement);
        });

        // Add event listeners for Read more buttons
        container.querySelectorAll('.read-more[data-type="project"]').forEach(button => {
            button.addEventListener('click', () => {
                const projectId = parseInt(button.getAttribute('data-project-id'));
                const project = this.data.projects.find(p => p.id === projectId);
                if (project) {
                    this.showReadMoreModal(project.title, project.description);
                }
            });
        });
    }

    editAbout() {
        this.showEditModal('Edit About Section', `
            <textarea id="aboutTextarea" placeholder="About text...">${this.data.about}</textarea>
            <div class="markdown-help" style="margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 4px; font-size: 12px;">
                <strong>Markdown Support:</strong>
                <strong>Bold</strong> **text**, <em>Italic</em> *text*, <code>code</code> \`text\`, <del>Strike</del> ~~text~~<br>
                Headers: # H1, ## H2, ### H3<br>
                Lists: - item or 1. item, > Blockquote, [link](url)<br>
                <strong>Shortcuts:</strong> Cmd/Ctrl+B (bold), I (italic), K (code), Shift+K (link), S (strike), Q (quote), L (list)
            </div>
            <button onclick="portfolio.saveAbout()">Save</button>
        `);
    }

    async saveAbout() {
        const newAbout = document.getElementById('aboutTextarea').value;
        this.data.about = newAbout;
        await this.saveData();
        this.renderContent();
        this.closeModals();
    }

    editPhoto() {
        // If there's already a photo, show option to edit existing or upload new
        if (this.data.profilePhoto && !this.data.profilePhoto.includes('data:image/svg+xml')) {
            this.showEditModal('Edit Photo', `
                <div style="text-align: center; margin-bottom: 20px;">
                    <img src="${this.data.profilePhoto}" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 2px solid #3498db;">
                </div>
                <button onclick="portfolio.editExistingPhoto()" style="width: 100%; margin-bottom: 10px; padding: 10px; background: #3498db; color: white; border: none; border-radius: 5px;">Edit Current Photo</button>
                <button onclick="portfolio.uploadNewPhoto()" style="width: 100%; padding: 10px; background: #27ae60; color: white; border: none; border-radius: 5px;">Upload New Photo</button>
            `);
        } else {
            this.uploadNewPhoto();
        }
    }

    editExistingPhoto() {
        this.closeModals();
        // Convert current photo to image and edit it
        this.originalImage = new Image();
        this.originalImage.onload = () => {
            this.showImageEditor();
        };
        this.originalImage.src = this.data.profilePhoto;
    }

    uploadNewPhoto() {
        this.closeModals();
        document.getElementById('photoInput').click();
    }

    handlePhotoUpload(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.originalImage = new Image();
                this.originalImage.onload = () => {
                    this.showImageEditor();
                };
                this.originalImage.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    showImageEditor() {
        const modal = document.getElementById('imageEditorModal');
        modal.style.display = 'block';
        document.body.classList.add('modal-open');
        
        this.canvas = document.getElementById('imageCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Reset controls
        this.resetImageEditor();
        
        // Draw the image
        this.updateCanvas();
    }

    updateCanvas() {
        if (!this.originalImage || !this.ctx) return;
        
        const zoom = parseInt(document.getElementById('zoomSlider').value) / 100;
        const moveX = parseInt(document.getElementById('moveX').value);
        const moveY = parseInt(document.getElementById('moveY').value);
        
        // Update zoom display
        document.getElementById('zoomValue').textContent = Math.round(zoom * 100) + '%';
        
        // Enable high-quality rendering
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Calculate image dimensions to fit in canvas while maintaining aspect ratio
        const canvasSize = 600; // Updated from 400 to 600 for higher quality
        const imgWidth = this.originalImage.width;
        const imgHeight = this.originalImage.height;
        
        let drawWidth, drawHeight;
        if (imgWidth > imgHeight) {
            drawWidth = canvasSize * zoom;
            drawHeight = (imgHeight / imgWidth) * canvasSize * zoom;
        } else {
            drawHeight = canvasSize * zoom;
            drawWidth = (imgWidth / imgHeight) * canvasSize * zoom;
        }
        
        // Calculate position (center + user offset)
        const x = (canvasSize - drawWidth) / 2 + moveX;
        const y = (canvasSize - drawHeight) / 2 + moveY;
        
        // Draw the image
        this.ctx.drawImage(this.originalImage, x, y, drawWidth, drawHeight);
    }

    resetImageEditor() {
        document.getElementById('zoomSlider').value = 100;
        document.getElementById('moveX').value = 0;
        document.getElementById('moveY').value = 0;
        if (this.originalImage) {
            this.updateCanvas();
        }
    }

    async saveEditedImage() {
        if (!this.canvas) return;
        
        // Create a high-resolution canvas for the circular crop
        const cropCanvas = document.createElement('canvas');
        const cropCtx = cropCanvas.getContext('2d');
        const size = 600; // Increased from 200 to 600 for much higher quality
        
        cropCanvas.width = size;
        cropCanvas.height = size;
        
        // Enable high-quality rendering
        cropCtx.imageSmoothingEnabled = true;
        cropCtx.imageSmoothingQuality = 'high';
        
        // Create circular clipping path
        cropCtx.beginPath();
        cropCtx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
        cropCtx.clip();
        
        // Calculate the area to crop from the main canvas (where the crop circle is)
        const sourceSize = 300; // Updated from 200 to 300 to match the larger canvas (crop circle size)
        const sourceX = this.canvas.width/2 - sourceSize/2;
        const sourceY = this.canvas.height/2 - sourceSize/2;
        
        // Draw the high-quality cropped portion using drawImage (much better than getImageData)
        cropCtx.drawImage(
            this.canvas, 
            sourceX, sourceY, sourceSize, sourceSize,  // source rectangle 
            0, 0, size, size                           // destination rectangle (upscaled)
        );
        
        // Save as PNG for lossless quality (no compression artifacts)
        this.data.profilePhoto = cropCanvas.toDataURL('image/png');
        await this.saveData();
        this.renderContent();
        this.closeModals();
    }

    uploadExpLogo() {
        document.getElementById('logoInput').click();
    }
    
    handleExpLogoUpload(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                // Store the logo data temporarily
                this.tempExpLogo = e.target.result;
                
                // Update UI
                document.getElementById('logoFileName').textContent = file.name;
                document.getElementById('logoPreview').style.display = 'block';
                document.getElementById('logoPreviewImg').src = this.tempExpLogo;
            };
            reader.readAsDataURL(file);
        }
    }

    async handleResumeUpload(e) {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            const reader = new FileReader();
            reader.onload = async (e) => {
                this.data.resume = e.target.result;
                await this.saveData();
                this.renderContent();
                this.closeModals();
            };
            reader.readAsDataURL(file);
        } else if (file) {
            alert('Please select a PDF file.');
        }
    }

    openResume(e) {
        e.preventDefault();
        if (this.data.resume) {
            // Create blob from base64 data and open in new tab
            const base64Data = this.data.resume.split(',')[1];
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
        }
    }

    removeExpLogo() {
        this.tempExpLogo = null;
        document.getElementById('logoFileName').textContent = 'No file chosen';
        document.getElementById('logoPreview').style.display = 'none';
        document.getElementById('logoPreviewImg').src = '';
    }

    generateMonthOptions(selectedMonth = '') {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return months.map((month, index) => 
            `<option value="${index + 1}" ${selectedMonth == index + 1 ? 'selected' : ''}>${month}</option>`
        ).join('');
    }

    generateYearOptions(selectedYear = '') {
        const currentYear = new Date().getFullYear();
        const startYear = currentYear - 50;
        const options = [];
        for (let year = currentYear + 5; year >= startYear; year--) {
            options.push(`<option value="${year}" ${selectedYear == year ? 'selected' : ''}>${year}</option>`);
        }
        return options.join('');
    }

    addExperience() {
        this.showEditModal('Add Experience', `
            <input type="text" id="expTitle" placeholder="Company">
            <input type="text" id="expCompany" placeholder="Job Title">
            <div style="margin: 15px 0;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Company Logo (optional):</label>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <button type="button" onclick="portfolio.uploadExpLogo()" style="padding: 8px 12px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">Choose Logo</button>
                    <span id="logoFileName" style="color: #666; font-size: 12px;">No file chosen</span>
                </div>
                <div id="logoPreview" style="margin-top: 10px; display: none;">
                    <img id="logoPreviewImg" style="width: 50px; height: 50px; object-fit: cover; border: 1px solid #ddd; border-radius: 4px;">
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 10px 0;">
                <div>
                    <label>Start Date:</label>
                    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 5px;">
                        <select id="expStartMonth">
                            <option value="">Month</option>
                            ${this.generateMonthOptions()}
                        </select>
                        <select id="expStartYear">
                            <option value="">Year</option>
                            ${this.generateYearOptions()}
                        </select>
                    </div>
                </div>
                <div>
                    <label>End Date:</label>
                    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 5px;">
                        <select id="expEndMonth">
                            <option value="">Month</option>
                            ${this.generateMonthOptions()}
                        </select>
                        <select id="expEndYear">
                            <option value="">Year</option>
                            ${this.generateYearOptions()}
                        </select>
                    </div>
                    <label class="checkbox-label">
                        <input type="checkbox" id="expCurrent" onchange="portfolio.toggleCurrentJob()"> Current Position
                    </label>
                </div>
            </div>
            <textarea id="expDescription" placeholder="Job description (optional)..."></textarea>
            <div class="markdown-help" style="margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 4px; font-size: 12px;">
                <strong>Markdown Support:</strong>
                <strong>Bold</strong> **text**, <em>Italic</em> *text*, <code>code</code> \`text\`, <del>Strike</del> ~~text~~<br>
                Headers: # H1, ## H2, ### H3 | Lists: - item or 1. item | > Blockquote | [link](url)
            </div>
            <button onclick="portfolio.saveExperience()">Save</button>
        `);
        
        // Reset logo storage
        this.tempExpLogo = null;
    }

    toggleCurrentJob() {
        const isCurrent = document.getElementById('expCurrent').checked;
        const endMonth = document.getElementById('expEndMonth');
        const endYear = document.getElementById('expEndYear');
        
        if (isCurrent) {
            endMonth.disabled = true;
            endYear.disabled = true;
            endMonth.value = '';
            endYear.value = '';
        } else {
            endMonth.disabled = false;
            endYear.disabled = false;
        }
    }

    async saveExperience() {
        const title = document.getElementById('expTitle').value;
        const company = document.getElementById('expCompany').value;
        const startMonth = document.getElementById('expStartMonth').value;
        const startYear = document.getElementById('expStartYear').value;
        const endMonth = document.getElementById('expEndMonth').value;
        const endYear = document.getElementById('expEndYear').value;
        const isCurrent = document.getElementById('expCurrent').checked;
        const description = document.getElementById('expDescription').value;

        if (title && company && startMonth && startYear) {
            const monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ];
            
            const startDate = `${monthNames[startMonth - 1]} ${startYear}`;
            let endDate;
            
            if (isCurrent) {
                endDate = 'Present';
            } else if (endMonth && endYear) {
                endDate = `${monthNames[endMonth - 1]} ${endYear}`;
            } else {
                alert('Please fill end date or check "Current Position"!');
                return;
            }

            const newExp = {
                id: Date.now(),
                title: company, // expCompany is actually the job title
                company: title, // expTitle is actually the company
                startMonth: parseInt(startMonth),
                startYear: parseInt(startYear),
                endMonth: isCurrent ? null : parseInt(endMonth),
                endYear: isCurrent ? null : parseInt(endYear),
                isCurrent,
                date: `${startDate} - ${endDate}`,
                description,
                logo: this.tempExpLogo || null // Include the logo if uploaded
            };
            this.data.experiences.push(newExp);
            await this.saveData();
            this.renderContent();
            this.closeModals();
            
            // Clear temporary logo storage
            this.tempExpLogo = null;
        } else {
            alert('Please fill title, company, and start date!');
        }
    }

    editExperience(id) {
        const exp = this.data.experiences.find(e => e.id === id);
        if (!exp) return;

        this.showEditModal('Edit Experience', `
            <input type="text" id="expTitle" placeholder="Company" value="${exp.company}">
            <input type="text" id="expCompany" placeholder="Job title" value="${exp.title}">
            <div style="margin: 15px 0;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Company Logo (optional):</label>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <button type="button" onclick="portfolio.uploadExpLogo()" style="padding: 8px 12px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">Choose Logo</button>
                    <span id="logoFileName" style="color: #666; font-size: 12px;">${exp.logo ? 'Logo uploaded' : 'No file chosen'}</span>
                    ${exp.logo ? `<button type="button" onclick="portfolio.removeExpLogo()" style="padding: 4px 8px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">Remove</button>` : ''}
                </div>
                <div id="logoPreview" style="margin-top: 10px; ${exp.logo ? 'display: block;' : 'display: none;'}">
                    <img id="logoPreviewImg" style="width: 50px; height: 50px; object-fit: cover; border: 1px solid #ddd; border-radius: 4px;" src="${exp.logo || ''}">
                </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 10px 0;">
                <div>
                    <label>Start Date:</label>
                    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 5px;">
                        <select id="expStartMonth">
                            <option value="">Month</option>
                            ${this.generateMonthOptions(exp.startMonth)}
                        </select>
                        <select id="expStartYear">
                            <option value="">Year</option>
                            ${this.generateYearOptions(exp.startYear)}
                        </select>
                    </div>
                </div>
                <div>
                    <label>End Date:</label>
                    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 5px;">
                        <select id="expEndMonth" ${exp.isCurrent ? 'disabled' : ''}>
                            <option value="">Month</option>
                            ${this.generateMonthOptions(exp.endMonth)}
                        </select>
                        <select id="expEndYear" ${exp.isCurrent ? 'disabled' : ''}>
                            <option value="">Year</option>
                            ${this.generateYearOptions(exp.endYear)}
                        </select>
                    </div>
                    <label class="checkbox-label">
                        <input type="checkbox" id="expCurrent" ${exp.isCurrent ? 'checked' : ''} onchange="portfolio.toggleCurrentJob()"> Current Position
                    </label>
                </div>
            </div>
            <textarea id="expDescription" placeholder="Job description (optional)...">${exp.description}</textarea>
            <div class="markdown-help" style="margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 4px; font-size: 12px;">
                <strong>Markdown Support:</strong>
                <strong>Bold</strong> **text**, <em>Italic</em> *text*, <code>code</code> \`text\`, <del>Strike</del> ~~text~~<br>
                Headers: # H1, ## H2, ### H3 | Lists: - item or 1. item | > Blockquote | [link](url)
            </div>
            <button onclick="portfolio.updateExperience(${id})">Update</button>
        `);
        
        // Store current logo for editing
        this.tempExpLogo = exp.logo;
        this.editingExpId = id;
    }

    async updateExperience(id) {
        const title = document.getElementById('expTitle').value;
        const company = document.getElementById('expCompany').value;
        const startMonth = document.getElementById('expStartMonth').value;
        const startYear = document.getElementById('expStartYear').value;
        const endMonth = document.getElementById('expEndMonth').value;
        const endYear = document.getElementById('expEndYear').value;
        const isCurrent = document.getElementById('expCurrent').checked;
        const description = document.getElementById('expDescription').value;

        if (title && company && startMonth && startYear) {
            const monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ];
            
            const startDate = `${monthNames[startMonth - 1]} ${startYear}`;
            let endDate;
            
            if (isCurrent) {
                endDate = 'Present';
            } else if (endMonth && endYear) {
                endDate = `${monthNames[endMonth - 1]} ${endYear}`;
            } else {
                alert('Please fill end date or check "Current Position"!');
                return;
            }

            const expIndex = this.data.experiences.findIndex(e => e.id === id);
            if (expIndex !== -1) {
                this.data.experiences[expIndex] = {
                    id,
                    title: company, // expCompany is actually the job title
                    company: title, // expTitle is actually the company
                    startMonth: parseInt(startMonth),
                    startYear: parseInt(startYear),
                    endMonth: isCurrent ? null : parseInt(endMonth),
                    endYear: isCurrent ? null : parseInt(endYear),
                    isCurrent,
                    date: `${startDate} - ${endDate}`,
                    description,
                    logo: this.tempExpLogo, // Use the updated logo (could be null if removed)
                    order: this.data.experiences[expIndex].order // Preserve existing order
                };
                await this.saveData();
                this.renderContent();
                this.closeModals();
                
                // Clear temporary logo storage
                this.tempExpLogo = null;
                this.editingExpId = null;
            }
        } else {
            alert('Please fill title, company, and start date!');
        }
    }

    async deleteExperience(id) {
        if (confirm('Are you sure you want to delete this experience?')) {
            this.data.experiences = this.data.experiences.filter(exp => exp.id !== id);
            await this.saveData();
            this.renderContent();
        }
    }

    addProject() {
        this.showEditModal('Add Project', `
            <input type="text" id="projectTitle" placeholder="Project Title">
            <textarea id="projectDescription" placeholder="Project description (optional)..."></textarea>
            <div class="markdown-help" style="margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 4px; font-size: 12px;">
                <strong>Markdown Support:</strong>
                <strong>Bold</strong> **text**, <em>Italic</em> *text*, <code>code</code> \`text\`, <del>Strike</del> ~~text~~<br>
                Headers: # H1, ## H2, ### H3 | Lists: - item or 1. item | > Blockquote | [link](url)
            </div>
            <input type="text" id="projectTech" placeholder="Technologies (comma-separated)">
            <select id="projectYear">
                <option value="">Select Year</option>
                ${this.generateYearOptions()}
            </select>
            <div id="projectLinks">
                <label style="font-weight: bold; margin-top: 15px; display: block;">Project Links:</label>
                <div class="link-group">
                    <input type="text" placeholder="Link Name (e.g., GitHub, Demo, Docs)" class="link-name">
                    <input type="text" placeholder="URL" class="link-url">
                    <button type="button" onclick="portfolio.removeLinkGroup(this)" class="remove-link-btn">Remove</button>
                </div>
            </div>
            <button type="button" onclick="portfolio.addLinkGroup()" class="add-link-btn">Add Another Link</button>
            <button onclick="portfolio.saveProject()">Save</button>
        `);
    }

    addLinkGroup() {
        const linksContainer = document.getElementById('projectLinks');
        const linkGroup = document.createElement('div');
        linkGroup.className = 'link-group';
        linkGroup.innerHTML = `
            <input type="text" placeholder="Link Name (e.g., GitHub, Demo, Docs)" class="link-name">
            <input type="text" placeholder="URL" class="link-url">
            <button type="button" onclick="portfolio.removeLinkGroup(this)" class="remove-link-btn">Remove</button>
        `;
        linksContainer.appendChild(linkGroup);
    }

    removeLinkGroup(button) {
        const linkGroups = document.querySelectorAll('.link-group');
        if (linkGroups.length > 1) {
            button.parentElement.remove();
        }
    }

    collectProjectLinks() {
        const linkGroups = document.querySelectorAll('.link-group');
        const links = [];
        linkGroups.forEach(group => {
            const name = group.querySelector('.link-name').value.trim();
            const url = group.querySelector('.link-url').value.trim();
            if (name && url) {
                links.push({ name, url });
            }
        });
        return links;
    }

    renderProjectLinks(project) {
        // Handle backward compatibility - convert old single link to links array
        const projectLinks = project.links || (project.link ? [{ name: 'Project Link', url: project.link }] : []);
        
        if (projectLinks.length === 0) return '';
        
        const githubIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>`;
        
        return `<div class="project-links">
            ${projectLinks.map(link => `
                <a href="${this.formatUrl(link.url)}" target="_blank" class="project-link">
                    ${githubIcon} ${link.name}
                </a>
            `).join('')}
        </div>`;
    }

    async saveProject() {
        const title = document.getElementById('projectTitle').value;
        const description = document.getElementById('projectDescription').value;
        const techString = document.getElementById('projectTech').value;
        const year = document.getElementById('projectYear').value;
        const links = this.collectProjectLinks();

        if (title && techString) {
            const newProject = {
                id: Date.now(),
                title,
                description,
                technologies: techString.split(',').map(tech => tech.trim()),
                year: year || '',
                links: links
            };
            this.data.projects.push(newProject);
            await this.saveData();
            this.renderContent();
            this.closeModals();
        } else {
            alert('Please fill title and technologies!');
        }
    }

    editProject(id) {
        const project = this.data.projects.find(p => p.id === id);
        if (!project) return;

        // Handle backward compatibility - convert old single link to links array
        const projectLinks = project.links || (project.link ? [{ name: 'Project Link', url: project.link }] : []);
        
        const linksHtml = projectLinks.length > 0 
            ? projectLinks.map(link => `
                <div class="link-group">
                    <input type="text" placeholder="Link Name (e.g., GitHub, Demo, Docs)" class="link-name" value="${link.name}">
                    <input type="text" placeholder="URL" class="link-url" value="${link.url}">
                    <button type="button" onclick="portfolio.removeLinkGroup(this)" class="remove-link-btn">Remove</button>
                </div>
            `).join('')
            : `
                <div class="link-group">
                    <input type="text" placeholder="Link Name (e.g., GitHub, Demo, Docs)" class="link-name">
                    <input type="text" placeholder="URL" class="link-url">
                    <button type="button" onclick="portfolio.removeLinkGroup(this)" class="remove-link-btn">Remove</button>
                </div>
            `;

        this.showEditModal('Edit Project', `
            <input type="text" id="projectTitle" placeholder="Project Title" value="${project.title}">
            <textarea id="projectDescription" placeholder="Project description (optional)...">${project.description}</textarea>
            <div class="markdown-help" style="margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 4px; font-size: 12px;">
                <strong>Markdown Support:</strong>
                <strong>Bold</strong> **text**, <em>Italic</em> *text*, <code>code</code> \`text\`, <del>Strike</del> ~~text~~<br>
                Headers: # H1, ## H2, ### H3 | Lists: - item or 1. item | > Blockquote | [link](url)
            </div>
            <input type="text" id="projectTech" placeholder="Technologies (comma-separated)" value="${project.technologies.join(', ')}">
            <select id="projectYear">
                <option value="">Select Year</option>
                ${this.generateYearOptions(project.year)}
            </select>
            <div id="projectLinks">
                <label style="font-weight: bold; margin-top: 15px; display: block;">Project Links:</label>
                ${linksHtml}
            </div>
            <button type="button" onclick="portfolio.addLinkGroup()" class="add-link-btn">Add Another Link</button>
            <button onclick="portfolio.updateProject(${id})">Update</button>
        `);
    }

    async updateProject(id) {
        const title = document.getElementById('projectTitle').value;
        const description = document.getElementById('projectDescription').value;
        const techString = document.getElementById('projectTech').value;
        const year = document.getElementById('projectYear').value;
        const links = this.collectProjectLinks();

        if (title && techString) {
            const projectIndex = this.data.projects.findIndex(p => p.id === id);
            if (projectIndex !== -1) {
                this.data.projects[projectIndex] = {
                    id,
                    title,
                    description,
                    technologies: techString.split(',').map(tech => tech.trim()),
                    year: year || '',
                    links: links,
                    order: this.data.projects[projectIndex].order // Preserve existing order
                };
                await this.saveData();
                this.renderContent();
                this.closeModals();
            }
        } else {
            alert('Please fill title and technologies!');
        }
    }

    async deleteProject(id) {
        if (confirm('Are you sure you want to delete this project?')) {
            this.data.projects = this.data.projects.filter(project => project.id !== id);
            await this.saveData();
            this.renderContent();
        }
    }

    async moveExperience(id, direction) {
        // Ensure all experiences have order properties
        this.data.experiences.forEach((exp, index) => {
            if (exp.order === undefined) exp.order = index;
        });

        const expIndex = this.data.experiences.findIndex(exp => exp.id === id);
        if (expIndex === -1) return;

        const exp = this.data.experiences[expIndex];
        if (direction === 'up' && expIndex > 0) {
            const prevExp = this.data.experiences[expIndex - 1];
            [exp.order, prevExp.order] = [prevExp.order, exp.order];
        } else if (direction === 'down' && expIndex < this.data.experiences.length - 1) {
            const nextExp = this.data.experiences[expIndex + 1];
            [exp.order, nextExp.order] = [nextExp.order, exp.order];
        }

        await this.saveData();
        this.renderContent();
    }

    async moveProject(id, direction) {
        // Ensure all projects have order properties
        this.data.projects.forEach((project, index) => {
            if (project.order === undefined) project.order = index;
        });

        const projectIndex = this.data.projects.findIndex(project => project.id === id);
        if (projectIndex === -1) return;

        const project = this.data.projects[projectIndex];
        if (direction === 'up' && projectIndex > 0) {
            const prevProject = this.data.projects[projectIndex - 1];
            [project.order, prevProject.order] = [prevProject.order, project.order];
        } else if (direction === 'down' && projectIndex < this.data.projects.length - 1) {
            const nextProject = this.data.projects[projectIndex + 1];
            [project.order, nextProject.order] = [nextProject.order, project.order];
        }

        await this.saveData();
        this.renderContent();
    }

    showEditModal(title, content) {
        const modal = document.getElementById('editModal');
        modal.querySelector('h2').textContent = title;
        modal.querySelector('#editForm').innerHTML = content;
        modal.style.display = 'block';
        document.body.classList.add('modal-open');
    }

    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        document.body.classList.remove('modal-open');
    }

    editHeader() {
        const currentName = this.data.header?.name || 'Taran Agarwal';
        this.showEditModal('Edit Header', `
            <input type="text" id="headerNameInput" placeholder="Your Name" value="${currentName}">
            <button onclick="portfolio.saveHeader()">Save</button>
        `);
    }
    
    async saveHeader() {
        const newName = document.getElementById('headerNameInput').value;
        if (newName.trim()) {
            if (!this.data.header) {
                this.data.header = { socialLinks: {} };
            }
            this.data.header.name = newName.trim();
            await this.saveData();
            this.renderContent();
            this.closeModals();
        } else {
            alert('Please enter a name!');
        }
    }
    
    editSocialLinks() {
        const currentGithub = this.data.header?.socialLinks?.github || '';
        const currentLinkedin = this.data.header?.socialLinks?.linkedin || '';
        const hasResume = this.data.resume ? true : false;
        
        this.showEditModal('Edit Social Links', `
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">GitHub URL:</label>
            <input type="url" id="githubUrlInput" placeholder="https://github.com/yourusername" value="${currentGithub}">
            
            <label style="display: block; margin-bottom: 5px; margin-top: 15px; font-weight: bold;">LinkedIn URL:</label>
            <input type="url" id="linkedinUrlInput" placeholder="https://www.linkedin.com/in/yourprofile" value="${currentLinkedin}">
            
            <div style="margin: 20px 0;">
                <label style="display: block; margin-bottom: 10px; font-weight: bold;">Resume (PDF):</label>
                ${hasResume ? `
                    <div style="margin-bottom: 10px; padding: 10px; background: #f0f0f0; border-radius: 5px;">
                        <span style="color: #27ae60;">✓ Resume uploaded</span>
                        <button type="button" onclick="portfolio.removeResume()" style="margin-left: 10px; padding: 4px 8px; background: #e74c3c; color: white; border: none; border-radius: 4px; font-size: 12px;">Remove</button>
                    </div>
                ` : ''}
                <button type="button" onclick="portfolio.uploadResume()" style="padding: 8px 12px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">${hasResume ? 'Replace Resume' : 'Upload Resume'}</button>
            </div>
            
            <button onclick="portfolio.saveSocialLinks()">Save</button>
        `);
    }
    
    async saveSocialLinks() {
        const newGithub = document.getElementById('githubUrlInput').value.trim();
        const newLinkedin = document.getElementById('linkedinUrlInput').value.trim();
        
        if (!this.data.header) {
            this.data.header = { name: 'Taran Agarwal', socialLinks: {} };
        }
        if (!this.data.header.socialLinks) {
            this.data.header.socialLinks = {};
        }
        
        this.data.header.socialLinks.github = newGithub;
        this.data.header.socialLinks.linkedin = newLinkedin;
        
        await this.saveData();
        this.renderContent();
        this.closeModals();
    }

    uploadResume() {
        document.getElementById('resumeInput').click();
    }

    async removeResume() {
        if (confirm('Are you sure you want to remove your resume?')) {
            this.data.resume = null;
            await this.saveData();
            this.renderContent();
            // Refresh the modal to show updated state
            this.editSocialLinks();
        }
    }

}

// Initialize the portfolio manager
const portfolio = new PortfolioManager();