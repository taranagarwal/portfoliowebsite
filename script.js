class PortfolioManager {
    constructor() {
        this.isLoggedIn = false;
        this.password = 'admin123'; // Change this to your desired password
        this.data = this.loadData();
        this.init();
    }

    init() {
        this.bindEvents();
        this.renderContent();
        this.updateUIBasedOnAuth();
    }

    loadData() {
        // Try to load from localStorage first (for editing)
        const saved = localStorage.getItem('portfolioData');
        if (saved) {
            return JSON.parse(saved);
        }
        
        // Default data for public viewing - UPDATE THIS WITH YOUR REAL INFO
        return {
            about: "Welcome to my portfolio! I'm a passionate developer with experience in creating innovative solutions.",
            experiences: [
                {
                    id: 1,
                    title: "Software Developer",
                    company: "Tech Company",
                    date: "2022 - Present",
                    description: "Developed web applications using modern technologies and frameworks."
                }
            ],
            projects: [
                {
                    id: 1,
                    title: "Portfolio Website",
                    description: "A responsive portfolio website built with HTML, CSS, and JavaScript.",
                    technologies: ["HTML", "CSS", "JavaScript"]
                }
            ],
            profilePhoto: "https://via.placeholder.com/200x200"
        };
    }

    saveData() {
        localStorage.setItem('portfolioData', JSON.stringify(this.data));
    }

    bindEvents() {
        // Auth events
        document.getElementById('loginBtn').addEventListener('click', () => this.showLoginModal());
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));

        // Edit events
        document.getElementById('editAboutBtn').addEventListener('click', () => this.editAbout());
        document.getElementById('editPhotoBtn').addEventListener('click', () => this.editPhoto());
        document.getElementById('addExperienceBtn').addEventListener('click', () => this.addExperience());
        document.getElementById('addProjectBtn').addEventListener('click', () => this.addProject());
        
        // Export button
        if (document.getElementById('exportDataBtn')) {
            document.getElementById('exportDataBtn').addEventListener('click', () => this.exportData());
        }

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

        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModals();
            }
        });
    }

    showLoginModal() {
        document.getElementById('loginModal').style.display = 'block';
    }

    handleLogin(e) {
        e.preventDefault();
        const enteredPassword = document.getElementById('password').value;
        
        if (enteredPassword === this.password) {
            this.isLoggedIn = true;
            this.updateUIBasedOnAuth();
            this.closeModals();
            document.getElementById('password').value = '';
        } else {
            alert('Incorrect password!');
        }
    }

    logout() {
        this.isLoggedIn = false;
        this.updateUIBasedOnAuth();
    }

    updateUIBasedOnAuth() {
        const editElements = document.querySelectorAll('.edit-btn, .add-btn');
        const loginBtn = document.getElementById('loginBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const exportBtn = document.getElementById('exportDataBtn');

        if (this.isLoggedIn) {
            editElements.forEach(el => el.style.display = 'inline-block');
            loginBtn.style.display = 'none';
            logoutBtn.style.display = 'inline-block';
            exportBtn.style.display = 'inline-block';
        } else {
            editElements.forEach(el => el.style.display = 'none');
            loginBtn.style.display = 'inline-block';
            logoutBtn.style.display = 'none';
            exportBtn.style.display = 'none';
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

        // Sort experiences chronologically (most recent first)
        const sortedExperiences = this.data.experiences.sort((a, b) => {
            // Extract end year from date string (e.g., "2022 - Present" or "2020 - 2022")
            const getEndYear = (dateStr) => {
                if (dateStr.toLowerCase().includes('present')) {
                    return 9999; // Present jobs come first
                }
                const matches = dateStr.match(/(\d{4})/g);
                return matches ? parseInt(matches[matches.length - 1]) : 0;
            };
            
            return getEndYear(b.date) - getEndYear(a.date);
        });

        sortedExperiences.forEach(exp => {
            const expElement = document.createElement('div');
            expElement.className = 'experience-item';
            expElement.innerHTML = `
                <h3>${exp.title}</h3>
                <h4>${exp.company}</h4>
                <p class="date">${exp.date}</p>
                <p>${exp.description}</p>
                ${this.isLoggedIn ? `
                    <button class="edit-btn" onclick="portfolio.editExperience(${exp.id})" style="position: absolute; top: 10px; right: 80px; padding: 5px 10px; font-size: 12px;">Edit</button>
                    <button class="delete-btn" onclick="portfolio.deleteExperience(${exp.id})">Delete</button>
                ` : ''}
            `;
            container.appendChild(expElement);
        });
    }

    renderProjects() {
        const container = document.getElementById('projectsList');
        container.innerHTML = '';

        this.data.projects.forEach(project => {
            const projectElement = document.createElement('div');
            projectElement.className = 'project-item';
            projectElement.innerHTML = `
                <h3>${project.title}</h3>
                <p>${project.description}</p>
                <div class="project-tech">
                    ${project.technologies.map(tech => `<span class="tech-tag">${tech}</span>`).join('')}
                </div>
                ${this.isLoggedIn ? `
                    <button class="edit-btn" onclick="portfolio.editProject(${project.id})" style="position: absolute; top: 10px; right: 80px; padding: 5px 10px; font-size: 12px;">Edit</button>
                    <button class="delete-btn" onclick="portfolio.deleteProject(${project.id})">Delete</button>
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

    saveAbout() {
        const newAbout = document.getElementById('aboutTextarea').value;
        this.data.about = newAbout;
        this.saveData();
        this.renderContent();
        this.closeModals();
    }

    editPhoto() {
        // If there's already a photo, show option to edit existing or upload new
        if (this.data.profilePhoto && this.data.profilePhoto !== "https://via.placeholder.com/200x200") {
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

    saveEditedImage() {
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
        this.saveData();
        this.renderContent();
        this.closeModals();
    }

    addExperience() {
        this.showEditModal('Add Experience', `
            <input type="text" id="expTitle" placeholder="Job Title">
            <input type="text" id="expCompany" placeholder="Company">
            <input type="text" id="expDate" placeholder="Date (e.g., 2022 - Present)">
            <textarea id="expDescription" placeholder="Job description..."></textarea>
            <button onclick="portfolio.saveExperience()">Save</button>
        `);
    }

    saveExperience() {
        const title = document.getElementById('expTitle').value;
        const company = document.getElementById('expCompany').value;
        const date = document.getElementById('expDate').value;
        const description = document.getElementById('expDescription').value;

        if (title && company && date && description) {
            const newExp = {
                id: Date.now(),
                title,
                company,
                date,
                description
            };
            this.data.experiences.push(newExp);
            this.saveData();
            this.renderContent();
            this.closeModals();
        } else {
            alert('Please fill all fields!');
        }
    }

    editExperience(id) {
        const exp = this.data.experiences.find(e => e.id === id);
        if (!exp) return;

        this.showEditModal('Edit Experience', `
            <input type="text" id="expTitle" placeholder="Job Title" value="${exp.title}">
            <input type="text" id="expCompany" placeholder="Company" value="${exp.company}">
            <input type="text" id="expDate" placeholder="Date (e.g., 2022 - Present)" value="${exp.date}">
            <textarea id="expDescription" placeholder="Job description...">${exp.description}</textarea>
            <button onclick="portfolio.updateExperience(${id})">Update</button>
        `);
    }

    updateExperience(id) {
        const title = document.getElementById('expTitle').value;
        const company = document.getElementById('expCompany').value;
        const date = document.getElementById('expDate').value;
        const description = document.getElementById('expDescription').value;

        if (title && company && date && description) {
            const expIndex = this.data.experiences.findIndex(e => e.id === id);
            if (expIndex !== -1) {
                this.data.experiences[expIndex] = { id, title, company, date, description };
                this.saveData();
                this.renderContent();
                this.closeModals();
            }
        } else {
            alert('Please fill all fields!');
        }
    }

    deleteExperience(id) {
        if (confirm('Are you sure you want to delete this experience?')) {
            this.data.experiences = this.data.experiences.filter(exp => exp.id !== id);
            this.saveData();
            this.renderContent();
        }
    }

    addProject() {
        this.showEditModal('Add Project', `
            <input type="text" id="projectTitle" placeholder="Project Title">
            <textarea id="projectDescription" placeholder="Project description..."></textarea>
            <input type="text" id="projectTech" placeholder="Technologies (comma-separated)">
            <button onclick="portfolio.saveProject()">Save</button>
        `);
    }

    saveProject() {
        const title = document.getElementById('projectTitle').value;
        const description = document.getElementById('projectDescription').value;
        const techString = document.getElementById('projectTech').value;

        if (title && description && techString) {
            const newProject = {
                id: Date.now(),
                title,
                description,
                technologies: techString.split(',').map(tech => tech.trim())
            };
            this.data.projects.push(newProject);
            this.saveData();
            this.renderContent();
            this.closeModals();
        } else {
            alert('Please fill all fields!');
        }
    }

    editProject(id) {
        const project = this.data.projects.find(p => p.id === id);
        if (!project) return;

        this.showEditModal('Edit Project', `
            <input type="text" id="projectTitle" placeholder="Project Title" value="${project.title}">
            <textarea id="projectDescription" placeholder="Project description...">${project.description}</textarea>
            <input type="text" id="projectTech" placeholder="Technologies (comma-separated)" value="${project.technologies.join(', ')}">
            <button onclick="portfolio.updateProject(${id})">Update</button>
        `);
    }

    updateProject(id) {
        const title = document.getElementById('projectTitle').value;
        const description = document.getElementById('projectDescription').value;
        const techString = document.getElementById('projectTech').value;

        if (title && description && techString) {
            const projectIndex = this.data.projects.findIndex(p => p.id === id);
            if (projectIndex !== -1) {
                this.data.projects[projectIndex] = {
                    id,
                    title,
                    description,
                    technologies: techString.split(',').map(tech => tech.trim())
                };
                this.saveData();
                this.renderContent();
                this.closeModals();
            }
        } else {
            alert('Please fill all fields!');
        }
    }

    deleteProject(id) {
        if (confirm('Are you sure you want to delete this project?')) {
            this.data.projects = this.data.projects.filter(project => project.id !== id);
            this.saveData();
            this.renderContent();
        }
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

    exportData() {
        // Create a formatted JavaScript object that can be pasted into the code
        const exportData = JSON.stringify(this.data, null, 8);
        
        this.showEditModal('Export Portfolio Data', `
            <p>Copy this data and replace the default data in your script.js file (around line 23-43):</p>
            <textarea readonly style="width: 100%; height: 300px; font-family: monospace; font-size: 12px;">${exportData}</textarea>
            <p style="margin-top: 10px; font-size: 14px; color: #666;">
                <strong>Instructions:</strong><br>
                1. Copy the text above<br>
                2. In script.js, find the "return {" section in loadData()<br>
                3. Replace the default data with your copied data<br>
                4. Deploy your updated files
            </p>
        `);
    }
}

// Initialize the portfolio manager
const portfolio = new PortfolioManager();