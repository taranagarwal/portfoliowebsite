class PortfolioManager {
    constructor() {
        this.isLoggedIn = false;
        // Authorized fingerprints - local and production versions
        this.authorizedFingerprints = ['-1877139945', 'YOUR_PRODUCTION_FINGERPRINT'];
        
        // Supabase configuration - add your actual values here
        this.supabaseUrl = 'YOUR_SUPABASE_URL'; // Replace with your Supabase project URL
        this.supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY'; // Replace with your anon public key
        this.supabaseServiceKey = 'YOUR_SUPABASE_SERVICE_KEY'; // Replace with your service role key
        this.supabase = null;
        
        this.init();
    }

    async init() {
        this.currentFingerprint = await this.generateFingerprint();
        console.log('Current fingerprint:', this.currentFingerprint);
        
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
            profilePhoto: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f0f0f0'/%3E%3Ccircle cx='100' cy='80' r='30' fill='%23ccc'/%3E%3Cellipse cx='100' cy='160' rx='50' ry='30' fill='%23ccc'/%3E%3C/svg%3E"
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
        document.getElementById('addExperienceBtn').addEventListener('click', () => this.addExperience());
        document.getElementById('addProjectBtn').addEventListener('click', () => this.addProject());

        // Photo upload
        document.getElementById('photoInput').addEventListener('change', (e) => this.handlePhotoUpload(e));

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
            const result = this.toggleFormatting(textarea.value, start, end, '`', '`');
            replacement = result.replacement;
            newStart = result.newStart;
            newEnd = result.newEnd;
        }
        
        if (replacement !== '') {
            // Replace the text
            const beforeSelection = textarea.value.substring(0, Math.min(newStart, start));
            const afterSelection = textarea.value.substring(Math.max(newEnd, end));
            textarea.value = beforeSelection + replacement + afterSelection;
            
            // Set cursor position
            if (replacement.includes('**') || replacement.includes('*') || replacement.includes('`')) {
                // Check if this is empty formatting (like ****, **, or ``)
                if ((replacement === '****') || (replacement === '**') || (replacement === '``')) {
                    // Place cursor in the middle of empty formatting
                    const middlePos = beforeSelection.length + Math.floor(replacement.length / 2);
                    textarea.setSelectionRange(middlePos, middlePos);
                } else {
                    // If we added formatting to selected text, place cursor after the formatted text
                    const newCursorPos = beforeSelection.length + replacement.length;
                    textarea.setSelectionRange(newCursorPos, newCursorPos);
                }
            } else {
                // If we removed formatting, select the unformatted text
                const newCursorStart = beforeSelection.length;
                const newCursorEnd = beforeSelection.length + replacement.length;
                textarea.setSelectionRange(newCursorStart, newCursorEnd);
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
            
            return hash.toString();
        } catch (error) {
            console.error('Fingerprint error:', error);
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

    truncateText(text, maxLength = 150) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    showDescriptionFromButton(button, title) {
        const description = button.getAttribute('data-description').replace(/\\n/g, '\n').replace(/&quot;/g, '"');
        this.showReadMoreModal(title, description);
    }

    showReadMoreModal(title, fullDescription) {
        const formattedDescription = this.formatMarkdown(fullDescription);
        this.showEditModal(title, `
            <div style="max-height: 400px; overflow-y: auto; padding: 10px;">
                <div style="line-height: 1.6; margin: 0; white-space: pre-wrap;">${formattedDescription}</div>
            </div>
        `);
    }

    formatMarkdown(text, includeLineBreaks = true) {
        // Use placeholders to avoid conflicts between different markdown formats
        let formatted = text
            // First, replace code with a placeholder
            .replace(/`([^`]+?)`/g, '{{CODE_START}}$1{{CODE_END}}')
            // Then replace bold with a placeholder
            .replace(/\*\*([^*]+?)\*\*/g, '{{BOLD_START}}$1{{BOLD_END}}')
            // Then replace remaining single asterisks with italic
            .replace(/\*([^*]+?)\*/g, '<em>$1</em>')
            // Replace placeholders with actual HTML tags
            .replace(/\{\{CODE_START\}\}/g, '<code>')
            .replace(/\{\{CODE_END\}\}/g, '</code>')
            .replace(/\{\{BOLD_START\}\}/g, '<strong>')
            .replace(/\{\{BOLD_END\}\}/g, '</strong>');
        
        // Only add line breaks if requested (for full modal view)
        if (includeLineBreaks) {
            formatted = formatted.replace(/\n/g, '<br>');
        } else {
            // For preview, replace newlines with spaces
            formatted = formatted.replace(/\n/g, ' ');
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
        // Render about section
        document.getElementById('aboutText').innerHTML = `<p>${this.data.about}</p>`;
        document.getElementById('profilePhoto').src = this.data.profilePhoto;

        // Render experiences
        this.renderExperiences();

        // Render projects
        this.renderProjects();
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
            
            expElement.innerHTML = `
                <h3>${exp.company}</h3>
                <h4>${exp.title}</h4>
                <p class="date">${exp.date}</p>
                ${hasDescription ? `
                    <div class="description-container">
                        <button class="view-description-btn" data-description="${exp.description.replace(/"/g, '&quot;').replace(/\n/g, '\\n')}" onclick="portfolio.showDescriptionFromButton(this, '${exp.company} - ${exp.title}')">View Description</button>
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
            const truncatedDescription = this.formatMarkdown(this.truncateText(project.description, 150), false);
            const needsReadMore = project.description && project.description.length > 150;
            
            projectElement.innerHTML = `
                <h3>${project.title} ${project.year ? `(${project.year})` : ''}</h3>
                <div class="description-container">
                    <p>${truncatedDescription}${needsReadMore ? ` <span class="read-more" data-description="${project.description.replace(/"/g, '&quot;').replace(/\n/g, '\\n')}" onclick="portfolio.showDescriptionFromButton(this, '${project.title}')">Read more</span>` : ''}</p>
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
    }

    editAbout() {
        this.showEditModal('Edit About Section', `
            <textarea id="aboutTextarea" placeholder="About text...">${this.data.about}</textarea>
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
        
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Calculate image dimensions to fit in canvas while maintaining aspect ratio
        const canvasSize = 400;
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
        
        // Create a new canvas for the circular crop
        const cropCanvas = document.createElement('canvas');
        const cropCtx = cropCanvas.getContext('2d');
        const size = 200;
        
        cropCanvas.width = size;
        cropCanvas.height = size;
        
        // Create circular clipping path
        cropCtx.beginPath();
        cropCtx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
        cropCtx.clip();
        
        // Get the image data from the center of the main canvas (where the crop circle is)
        const sourceX = this.canvas.width/2 - size/2;
        const sourceY = this.canvas.height/2 - size/2;
        
        // Draw the cropped portion
        const imageData = this.ctx.getImageData(sourceX, sourceY, size, size);
        cropCtx.putImageData(imageData, 0, 0);
        
        // Save the result
        this.data.profilePhoto = cropCanvas.toDataURL('image/jpeg', 0.9);
        await this.saveData();
        this.renderContent();
        this.closeModals();
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
            <button onclick="portfolio.saveExperience()">Save</button>
        `);
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
                description
            };
            this.data.experiences.push(newExp);
            await this.saveData();
            this.renderContent();
            this.closeModals();
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
            <button onclick="portfolio.updateExperience(${id})">Update</button>
        `);
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
                    order: this.data.experiences[expIndex].order // Preserve existing order
                };
                await this.saveData();
                this.renderContent();
                this.closeModals();
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
    }

    closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }

}

// Initialize the portfolio manager
const portfolio = new PortfolioManager();