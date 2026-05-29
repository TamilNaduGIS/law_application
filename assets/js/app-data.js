/**
 * Client-side data store (demo). Replace with API calls when backend is available.
 */
(function (global) {
    const DB_KEY = 'lawRecruitmentDB';
    const SESSION_KEY = 'lawRecruitmentSession';

    const DEFAULT_JOBS = [
        { id: 1, slNo: 1, postName: 'Additional Advocate General' },
        { id: 2, slNo: 2, postName: 'State Government Pleader' },
        { id: 3, slNo: 3, postName: 'Government Pleader' },
        { id: 4, slNo: 4, postName: 'Special Government Pleader' },
        { id: 5, slNo: 5, postName: 'Additional Government Pleader' },
        { id: 6, slNo: 6, postName: 'Government Advocate (Civil side)' },
        { id: 7, slNo: 7, postName: 'Government Advocate (Criminal Side)' },
        { id: 8, slNo: 8, postName: 'Government Advocate (Taxes)' }
    ];

    const DEMO_USER = {
        id: 'USR001',
        enrolmentNo: 'TN/12345/2015',
        password: 'demo123',
        advocateName: 'R. Venkatesh Kumar', 
        fatherName: 'R. Murugan',
        gender: 'Male', 
        maritalStatus: 'Married',
        dob: '1988-05-12',
        nationality: 'Indian',
        religion: 'Hindu',
        community: 'OC',
        mobile: '9876543210',
        phone: '044-23456789',
        email: 'venkatesh.kumar@example.com',
        pan: 'ABCDE1234F',
        district: 'Chennai',
        pincode: '600104',
        officeAddress: 'No. 12, High Court Road, Chennai - 600104',
        permanentAddress: 'No. 45, Anna Salai, Chennai - 600002'
    };

    function loadDb() {
        try {
            const raw = localStorage.getItem(DB_KEY);
            if (raw) return JSON.parse(raw);
        } catch (e) {
            console.warn('Failed to load DB', e);
        }
        return { users: [DEMO_USER], jobs: DEFAULT_JOBS, applications: [] };
    }

    function saveDb(db) {
        localStorage.setItem(DB_KEY, JSON.stringify(db));
    }

    function initDb() {
        const db = loadDb();
        if (!db.jobs || !db.jobs.length) db.jobs = DEFAULT_JOBS;
        if (!db.users || !db.users.length) db.users = [DEMO_USER];
        if (!db.applications) db.applications = [];
        saveDb(db);
        return db;
    }

    function nextUserId(users) {
        const nums = users
            .map((u) => parseInt(String(u.id).replace(/\D/g, ''), 10))
            .filter((n) => !isNaN(n));
        const next = (nums.length ? Math.max(...nums) : 0) + 1;
        return 'USR' + String(next).padStart(3, '0');
    }

    const AppData = {
        getJobs() {
            return initDb().jobs;
        },

        getJobById(jobId) {
            const id = parseInt(jobId, 10);
            return this.getJobs().find((j) => j.id === id) || null;
        },

        getUserById(userId) {
            if (!userId) return null;
            return initDb().users.find((u) => u.id === userId) || null;
        },

        getUserByEnrolment(enrolmentNo) {
            const norm = (enrolmentNo || '').trim().toLowerCase();
            return initDb().users.find((u) => u.enrolmentNo.trim().toLowerCase() === norm) || null;
        },

        registerUser(payload) {
            const db = initDb();
            if (this.getUserByEnrolment(payload.enrolmentNo)) {
                return { ok: false, error: 'Enrolment number already registered.' };
            }
            const user = {
                id: nextUserId(db.users),
                enrolmentNo: payload.enrolmentNo.trim(),
                password: payload.password,
                advocateName: payload.advocateName.trim(),
                fatherName: payload.fatherName || '',
                gender: payload.gender || 'Male',
                maritalStatus: payload.maritalStatus || 'Single',
                dob: payload.dob || '',
                nationality: payload.nationality || 'Indian',
                religion: payload.religion || '',
                community: payload.community || 'OC',
                mobile: payload.mobile.trim(),
                phone: payload.phone || '',
                email: payload.email.trim(),
                pan: payload.pan || '',
                officeAddress: payload.officeAddress || '',
                permanentAddress: payload.permanentAddress || ''
            };
            db.users.push(user);
            saveDb(db);
            return { ok: true, user };
        },

        login(enrolmentNo, password) {
            const user = this.getUserByEnrolment(enrolmentNo);
            if (!user || user.password !== password) {
                return { ok: false, error: 'Invalid enrolment number or password.' };
            }
            const session = {
                userId: user.id,
                enrolmentNo: user.enrolmentNo,
                advocateName: user.advocateName
            };
            sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
            sessionStorage.setItem('isLoggedIn', 'true');
            sessionStorage.setItem('userId', user.id);
            sessionStorage.setItem('enrolmentNo', user.enrolmentNo);
            sessionStorage.setItem('advocateName', user.advocateName);
            return { ok: true, session, user };
        },

        getSession() {
            try {
                const raw = sessionStorage.getItem(SESSION_KEY);
                if (raw) return JSON.parse(raw);
            } catch (e) { /* ignore */ }
            if (sessionStorage.getItem('isLoggedIn') === 'true' && sessionStorage.getItem('userId')) {
                return {
                    userId: sessionStorage.getItem('userId'),
                    enrolmentNo: sessionStorage.getItem('enrolmentNo') || '',
                    advocateName: sessionStorage.getItem('advocateName') || ''
                };
            }
            return null;
        },

        isLoggedIn() {
            return !!this.getSession();
        },

        logout() {
            sessionStorage.removeItem(SESSION_KEY);
            sessionStorage.removeItem('isLoggedIn');
            sessionStorage.removeItem('userId');
            sessionStorage.removeItem('enrolmentNo');
            sessionStorage.removeItem('advocateName');
            sessionStorage.removeItem('selectedPost');
            sessionStorage.removeItem('selectedJobId');
            sessionStorage.removeItem('tempAadhaar');
            sessionStorage.removeItem('applicantAadhaar');
        },

        updateUserProfile(userId, fields) {
            const db = initDb();
            const idx = db.users.findIndex((u) => u.id === userId);
            if (idx === -1) return { ok: false, error: 'User not found.' };
            db.users[idx] = { ...db.users[idx], ...fields };
            saveDb(db);
            return { ok: true, user: db.users[idx] };
        },

        requireAuth(loginUrl) {
            if (this.isLoggedIn()) return this.getSession();
            const dest = loginUrl || 'login.html';
            const returnTo = encodeURIComponent(global.location.pathname.split('/').pop() + global.location.search);
            global.location.href = dest + (dest.includes('?') ? '&' : '?') + 'return=' + returnTo;
            return null;
        },

        getApplication(userId, jobId) {
            const db = initDb();
            const jid = parseInt(jobId, 10);
            return db.applications.find((a) => a.userId === userId && a.jobId === jid) || null;
        },

        hasSubmittedApplication(userId, jobId) {
            const app = this.getApplication(userId, jobId);
            return app && app.status === 'submitted';
        },

        getSubmittedJobIds(userId) {
            const db = initDb();
            return db.applications
                .filter((a) => a.userId === userId && a.status === 'submitted')
                .map((a) => a.jobId);
        },

        saveApplication(userId, jobId, payload, status) {
            const db = initDb();
            const jid = parseInt(jobId, 10);
            const idx = db.applications.findIndex((a) => a.userId === userId && a.jobId === jid);
            const record = {
                userId,
                jobId: jid,
                status: status || 'draft',
                updatedAt: new Date().toISOString(),
                ...payload
            };
            if (status === 'submitted') {
                record.submittedAt = new Date().toISOString();
            }
            if (idx >= 0) {
                db.applications[idx] = { ...db.applications[idx], ...record };
            } else {
                record.id = 'APP' + String(db.applications.length + 1).padStart(4, '0');
                db.applications.push(record);
            }
            saveDb(db);
            return record;
        },

        submitApplication(userId, jobId, payload) {
            return this.saveApplication(userId, jobId, payload, 'submitted');
        },

        /** Personal fields from user profile for tab 1 prefill */
        getPersonalProfile(userId) {
            const user = this.getUserById(userId);
            if (!user) return null;
            return {
                advocateName: user.advocateName,
                enrolmentNo: user.enrolmentNo,
                fatherName: user.fatherName,
                gender: user.gender,
                maritalStatus: user.maritalStatus,
                dob: user.dob,
                nationality: user.nationality,
                religion: user.religion,
                community: user.community,
                mobile: user.mobile,
                phone: user.phone,
                email: user.email,
                pan: user.pan,
                district: user.district || '',
                pincode: user.pincode || '',
                officeAddress: user.officeAddress,
                permanentAddress: user.permanentAddress
            };
        }
    };

    initDb();
    global.AppData = AppData;
})(typeof window !== 'undefined' ? window : global);







/* =========================================
BACK TO TOP BUTTON
========================================= */

const backToTopBtn = document.getElementById('backToTopBtn');

window.addEventListener('scroll', function(){

    if(window.scrollY > 250){

        backToTopBtn.classList.add('show');

    }else{

        backToTopBtn.classList.remove('show');

    }

});

/* SMOOTH SCROLL */

backToTopBtn.addEventListener('click', function(){

    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });

});

