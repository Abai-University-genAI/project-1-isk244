// Глобалды айнымалылар
let currentReportData = {
    attendance: [],
    students: [],
    subjects: []
};

// Есеп фильтрлерін жүктеу
async function loadReportFilters() {
    try {
        const [students, subjects, groups] = await Promise.all([
            apiGet(`${API_URL}/students`),
            apiGet(`${API_URL}/subjects`),
            apiGet(`${API_URL}/groups`)
        ]);
        
        // Топтар селекты
        const groupSelect = document.getElementById('reportGroup');
        if (groupSelect) {
            groupSelect.innerHTML = '<option value="all">Барлық топтар</option>';
            groups.forEach(g => {
                groupSelect.innerHTML += `<option value="${g}">${g}</option>`;
            });
            
            groupSelect.addEventListener('change', function() {
                updateStudentSelect(students);
            });
        }
        
        // Студенттер селекты
        updateStudentSelect(students);
        
        // Пәндер селекты
        const subjectSelect = document.getElementById('reportSubject');
        if (subjectSelect) {
            subjectSelect.innerHTML = '<option value="all">Барлық пәндер</option>';
            subjects.forEach(s => {
                subjectSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
            });
        }
        
        // Күндерді орнату
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
        
        const startDate = document.getElementById('reportStartDate');
        const endDate = document.getElementById('reportEndDate');
        
        if (startDate) startDate.value = startOfMonth;
        if (endDate) endDate.value = endOfMonth;
        
    } catch (error) {
        console.error('Есеп фильтрлерін жүктеу қатесі:', error);
    }
}

// Студенттер селектын жаңарту
function updateStudentSelect(allStudents) {
    const studentSelect = document.getElementById('reportStudent');
    const groupSelect = document.getElementById('reportGroup');
    
    if (!studentSelect || !groupSelect) return;
    
    const selectedGroup = groupSelect.value;
    
    let filteredStudents = allStudents;
    if (selectedGroup && selectedGroup !== 'all') {
        filteredStudents = allStudents.filter(s => s.group_name === selectedGroup);
    }
    
    studentSelect.innerHTML = '<option value="all">Барлық студенттер</option>';
    filteredStudents.forEach(s => {
        studentSelect.innerHTML += `<option value="${s.id}">${s.name} (${s.group_name})</option>`;
    });
    
    if (filteredStudents.length === 0) {
        studentSelect.innerHTML = '<option value="all">Бұл топта студенттер жоқ</option>';
    }
}

// Есеп жасау
window.generateReport = async function() {
    const generateBtn = document.getElementById('generateReportBtn');
    generateBtn.classList.add('btn-pulse');
    
    setTimeout(() => {
        generateBtn.classList.remove('btn-pulse');
    }, 1000);
    
    const studentId = document.getElementById('reportStudent')?.value || 'all';
    const subjectId = document.getElementById('reportSubject')?.value || 'all';
    const groupName = document.getElementById('reportGroup')?.value || 'all';
    const startDate = document.getElementById('reportStartDate')?.value || '';
    const endDate = document.getElementById('reportEndDate')?.value || '';
    const reportType = document.getElementById('reportType')?.value || 'summary';
    
    try {
        showLoading();
        
        let url = `${API_URL}/attendance?`;
        const params = [];
        
        if (studentId && studentId !== 'all') params.push(`student_id=${studentId}`);
        if (subjectId && subjectId !== 'all') params.push(`subject_id=${subjectId}`);
        if (groupName && groupName !== 'all') params.push(`group=${encodeURIComponent(groupName)}`);
        if (startDate) params.push(`start_date=${startDate}`);
        if (endDate) params.push(`end_date=${endDate}`);
        
        url += params.join('&');
        
        const [attendance, students, subjects] = await Promise.all([
            apiGet(url),
            apiGet(`${API_URL}/students`),
            apiGet(`${API_URL}/subjects`)
        ]);
        
        currentReportData = {
            attendance,
            students,
            subjects
        };
        
        const resultDiv = document.getElementById('reportResult');
        if (!resultDiv) return;
        
        resultDiv.classList.add('fade-in');
        
        if (reportType === 'summary') {
            showSummaryReport(resultDiv, attendance, students, subjects, studentId, subjectId, groupName, startDate, endDate);
        } else if (reportType === 'detailed') {
            showDetailedReport(resultDiv, attendance, students, subjects, studentId, subjectId, groupName, startDate, endDate);
        } else if (reportType === 'chart') {
            showChartReport(resultDiv, attendance, students, subjects, studentId, subjectId, groupName, startDate, endDate);
        }
        
        setTimeout(() => {
            resultDiv.classList.remove('fade-in');
        }, 500);
        
        showToast('✨ Есеп сәтті жасалды!', 'success');
        
    } catch (error) {
        console.error('Есеп жасау қатесі:', error);
        showToast('❌ Есеп жасау кезінде қате орын алды', 'error');
    } finally {
        hideLoading();
    }
};

// Жиынтық есеп (анимациялармен)
function showSummaryReport(container, attendance, students, subjects, studentId, subjectId, groupName, startDate, endDate) {
    let filteredAttendance = [...attendance];
    let filteredStudents = [...students];
    let filteredSubjects = [...subjects];
    
    if (groupName !== 'all') {
        const groupStudentIds = students
            .filter(s => s.group_name === groupName)
            .map(s => s.id);
        filteredAttendance = filteredAttendance.filter(a => groupStudentIds.includes(a.student_id));
        filteredStudents = filteredStudents.filter(s => s.group_name === groupName);
    }
    
    if (studentId !== 'all') {
        filteredAttendance = filteredAttendance.filter(a => a.student_id == studentId);
    }
    
    if (subjectId !== 'all') {
        filteredAttendance = filteredAttendance.filter(a => a.subject_id == subjectId);
    }
    
    if (filteredAttendance.length === 0) {
        container.innerHTML = `
            <div class="empty-state animate-pop">
                <i class="fas fa-chart-line"></i>
                <h3>Деректер жоқ</h3>
                <p>Таңдалған кезеңде қатысу деректері жоқ</p>
                <button class="btn btn-primary" onclick="generateReport()">
                    <i class="fas fa-sync-alt"></i> Қайта іздеу
                </button>
            </div>
        `;
        return;
    }
    
    const totalRecords = filteredAttendance.length;
    const presentCount = filteredAttendance.filter(a => a.status === 'present').length;
    const lateCount = filteredAttendance.filter(a => a.status === 'late').length;
    const absentCount = filteredAttendance.filter(a => a.status === 'absent').length;
    
    const presentPercent = totalRecords > 0 ? ((presentCount + lateCount * 0.5) / totalRecords * 100).toFixed(1) : '0';
    
    const uniqueStudents = new Set(filteredAttendance.map(a => a.student_id)).size;
    const uniqueSubjects = new Set(filteredAttendance.map(a => a.subject_id)).size;
    
    let html = `
        <div class="report-content">
            <div class="report-header-animate">
                <h2 class="report-main-title">
                    <i class="fas fa-chart-pie"></i> 
                    Қатысу есебі
                    <small>${new Date().toLocaleDateString('kk-KZ')}</small>
                </h2>
                <div class="report-badge">📊 Жиынтық есеп</div>
            </div>
            
            <div class="report-filters-info animate-slide">
                ${groupName !== 'all' ? `<span class="filter-badge"><i class="fas fa-users"></i> Топ: ${groupName}</span>` : ''}
                ${studentId !== 'all' ? `<span class="filter-badge"><i class="fas fa-user-graduate"></i> ${getStudentName(filteredStudents, studentId)}</span>` : ''}
                ${subjectId !== 'all' ? `<span class="filter-badge"><i class="fas fa-book"></i> ${getSubjectName(subjects, subjectId)}</span>` : ''}
                <span class="filter-badge"><i class="fas fa-calendar"></i> ${startDate || '?'} - ${endDate || '?'}</span>
            </div>
            
            <div class="stats-grid-animate">
                <div class="report-stat-card total" style="animation-delay: 0.1s">
                    <div class="stat-icon"><i class="fas fa-database"></i></div>
                    <div class="stat-details">
                        <span class="stat-value counter" data-target="${totalRecords}">0</span>
                        <span class="stat-label">Барлық жазба</span>
                    </div>
                </div>
                <div class="report-stat-card" style="animation-delay: 0.2s">
                    <div class="stat-icon"><i class="fas fa-users"></i></div>
                    <div class="stat-details">
                        <span class="stat-value counter" data-target="${uniqueStudents}">0</span>
                        <span class="stat-label">Студенттер</span>
                    </div>
                </div>
                <div class="report-stat-card" style="animation-delay: 0.3s">
                    <div class="stat-icon"><i class="fas fa-book"></i></div>
                    <div class="stat-details">
                        <span class="stat-value counter" data-target="${uniqueSubjects}">0</span>
                        <span class="stat-label">Пәндер</span>
                    </div>
                </div>
                <div class="report-stat-card present" style="animation-delay: 0.4s">
                    <div class="stat-icon"><i class="fas fa-check-circle"></i></div>
                    <div class="stat-details">
                        <span class="stat-value counter" data-target="${presentCount}">0</span>
                        <span class="stat-label">Қатысқан</span>
                    </div>
                </div>
                <div class="report-stat-card late" style="animation-delay: 0.5s">
                    <div class="stat-icon"><i class="fas fa-clock"></i></div>
                    <div class="stat-details">
                        <span class="stat-value counter" data-target="${lateCount}">0</span>
                        <span class="stat-label">Кешіккен</span>
                    </div>
                </div>
                <div class="report-stat-card absent" style="animation-delay: 0.6s">
                    <div class="stat-icon"><i class="fas fa-times-circle"></i></div>
                    <div class="stat-details">
                        <span class="stat-value counter" data-target="${absentCount}">0</span>
                        <span class="stat-label">Қатыспаған</span>
                    </div>
                </div>
            </div>
            
            <div class="report-progress-section animate-scale">
                <h3><i class="fas fa-chart-line"></i> Жалпы қатысу көрсеткіші</h3>
                <div class="report-progress-bar">
                    <div class="progress-fill" style="width: 0%" data-width="${presentPercent}%">
                        <span class="progress-text">${presentPercent}%</span>
                    </div>
                </div>
            </div>
    `;
    
    html += '<h3 class="section-title"><i class="fas fa-book-open"></i> Пәндер бойынша қатысу</h3>';
    html += '<div class="subjects-stats">';
    
    let delay = 0.7;
    filteredSubjects.forEach(subject => {
        const subjectAttendance = filteredAttendance.filter(a => a.subject_id === subject.id);
        if (subjectAttendance.length === 0) return;
        
        const subPresent = subjectAttendance.filter(a => a.status === 'present').length;
        const subLate = subjectAttendance.filter(a => a.status === 'late').length;
        const subAbsent = subjectAttendance.filter(a => a.status === 'absent').length;
        const subTotal = subjectAttendance.length;
        const subPercent = subTotal > 0 ? ((subPresent + subLate * 0.5) / subTotal * 100).toFixed(1) : '0';
        
        let percentColor = '#4cc9f0';
        if (subPercent < 50) percentColor = '#f72585';
        else if (subPercent < 70) percentColor = '#f8961e';
        
        html += `
            <div class="subject-stat-card animate-slide-up" style="animation-delay: ${delay}s">
                <div class="subject-header">
                    <h4><i class="fas fa-book"></i> ${subject.name}</h4>
                    <span class="subject-total">${subTotal} сабақ</span>
                </div>
                <div class="subject-stats">
                    <div class="stat-row">
                        <span><i class="fas fa-check-circle" style="color: #4cc9f0;"></i> ${subPresent}</span>
                        <span><i class="fas fa-clock" style="color: #f8961e;"></i> ${subLate}</span>
                        <span><i class="fas fa-times-circle" style="color: #f72585;"></i> ${subAbsent}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 0%" data-width="${subPercent}%"></div>
                    </div>
                    <div class="percent-value" style="color: ${percentColor};">
                        ${subPercent}%
                    </div>
                </div>
            </div>
        `;
        delay += 0.1;
    });
    
    html += '</div>';
    
    html += '<h3 class="section-title"><i class="fas fa-user-graduate"></i> Студенттер бойынша қатысу</h3>';
    html += '<div class="students-stats">';
    
    filteredStudents.forEach(student => {
        const studentAttendance = filteredAttendance.filter(a => a.student_id === student.id);
        if (studentAttendance.length === 0) return;
        
        const studPresent = studentAttendance.filter(a => a.status === 'present').length;
        const studLate = studentAttendance.filter(a => a.status === 'late').length;
        const studAbsent = studentAttendance.filter(a => a.status === 'absent').length;
        const studTotal = studentAttendance.length;
        const studPercent = studTotal > 0 ? ((studPresent + studLate * 0.5) / studTotal * 100).toFixed(1) : '0';
        
        let percentColor = '#4cc9f0';
        if (studPercent < 50) percentColor = '#f72585';
        else if (studPercent < 70) percentColor = '#f8961e';
        
        html += `
            <div class="student-stat-card animate-slide-up" style="animation-delay: ${delay}s">
                <div class="student-info">
                    <div class="student-avatar">${student.name.charAt(0)}</div>
                    <div class="student-details">
                        <div class="student-name">${student.name}</div>
                        <div class="student-group">${student.group_name}</div>
                    </div>
                </div>
                <div class="student-stats">
                    <div class="stats-badges">
                        <span class="badge present"><i class="fas fa-check-circle"></i> ${studPresent}</span>
                        <span class="badge late"><i class="fas fa-clock"></i> ${studLate}</span>
                        <span class="badge absent"><i class="fas fa-times-circle"></i> ${studAbsent}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 0%" data-width="${studPercent}%"></div>
                    </div>
                    <div class="percent-value" style="color: ${percentColor};">
                        ${studPercent}%
                    </div>
                </div>
            </div>
        `;
        delay += 0.1;
    });
    
    html += '</div></div>';
    
    html += `
        <div class="report-actions animate-slide-up" style="animation-delay: 1.5s">
            <button class="btn btn-success" onclick="exportToExcel()">
                <i class="fas fa-file-excel"></i> Excel-ге экспорттау
            </button>
            <button class="btn btn-primary" onclick="saveReportToDatabase()">
                <i class="fas fa-save"></i> Есепті сақтау
            </button>
            <button class="btn btn-secondary" onclick="window.print()">
                <i class="fas fa-print"></i> Басып шығару
            </button>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Анимацияларды іске қосу
    setTimeout(() => {
        animateCounters();
        animateProgressBars();
    }, 100);
}

// Толық есеп
function showDetailedReport(container, attendance, students, subjects, studentId, subjectId, groupName, startDate, endDate) {
    let filteredAttendance = [...attendance];
    
    if (groupName !== 'all') {
        const groupStudentIds = students
            .filter(s => s.group_name === groupName)
            .map(s => s.id);
        filteredAttendance = filteredAttendance.filter(a => groupStudentIds.includes(a.student_id));
    }
    
    if (studentId !== 'all') {
        filteredAttendance = filteredAttendance.filter(a => a.student_id == studentId);
    }
    
    if (subjectId !== 'all') {
        filteredAttendance = filteredAttendance.filter(a => a.subject_id == subjectId);
    }
    
    if (filteredAttendance.length === 0) {
        container.innerHTML = `
            <div class="empty-state animate-pop">
                <i class="fas fa-table"></i>
                <h3>Деректер жоқ</h3>
                <p>Таңдалған кезеңде қатысу деректері жоқ</p>
                <button class="btn btn-primary" onclick="generateReport()">
                    <i class="fas fa-sync-alt"></i> Қайта іздеу
                </button>
            </div>
        `;
        return;
    }
    
    filteredAttendance.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    let html = `
        <div class="report-content">
            <div class="report-header-animate">
                <h2 class="report-main-title">
                    <i class="fas fa-list"></i> 
                    Толық қатысу тізімі
                    <small>${new Date().toLocaleDateString('kk-KZ')}</small>
                </h2>
                <div class="report-badge">📋 Толық тізім</div>
            </div>
            
            <div class="report-filters-info animate-slide">
                ${groupName !== 'all' ? `<span class="filter-badge"><i class="fas fa-users"></i> Топ: ${groupName}</span>` : ''}
                ${studentId !== 'all' ? `<span class="filter-badge"><i class="fas fa-user-graduate"></i> ${getStudentName(students, studentId)}</span>` : ''}
                ${subjectId !== 'all' ? `<span class="filter-badge"><i class="fas fa-book"></i> ${getSubjectName(subjects, subjectId)}</span>` : ''}
                <span class="filter-badge"><i class="fas fa-calendar"></i> ${startDate || '?'} - ${endDate || '?'}</span>
            </div>
            
            <div class="detailed-table-container animate-scale">
                <table class="detailed-table">
                    <thead>
                        <tr>
                            <th>№</th>
                            <th>Күн</th>
                            <th>Студент</th>
                            <th>Топ</th>
                            <th>Пән</th>
                            <th>Статус</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    filteredAttendance.forEach((record, index) => {
        const student = students.find(s => s.id === record.student_id);
        const subject = subjects.find(s => s.id === record.subject_id);
        
        if (!student || !subject) return;
        
        const statusText = {
            'present': 'Қатысты',
            'late': 'Кешікті',
            'absent': 'Қатыспады'
        }[record.status];
        
        const statusIcon = {
            'present': 'fa-check-circle',
            'late': 'fa-clock',
            'absent': 'fa-times-circle'
        }[record.status];
        
        const statusClass = {
            'present': 'status-present',
            'late': 'status-late',
            'absent': 'status-absent'
        }[record.status];
        
        html += `
            <tr class="table-row-animate" style="animation-delay: ${index * 0.05}s">
                <td>${index + 1}</td>
                <td>${record.date}</td>
                <td>
                    <div class="student-info">
                        <div class="student-avatar" style="width: 30px; height: 30px; font-size: 12px;">${student.name.charAt(0)}</div>
                        <span>${student.name}</span>
                    </div>
                </td>
                <td><span class="student-group-badge">${student.group_name}</span></td>
                <td>${subject.name}</td>
                <td><span class="status-badge ${statusClass}"><i class="fas ${statusIcon}"></i> ${statusText}</span></td>
            </tr>
        `;
    });
    
    html += `
                    </tbody>
                </table>
            </div>
            
            <div class="table-footer animate-slide-up">
                <p>📊 Барлығы: <strong>${filteredAttendance.length}</strong> жазба</p>
            </div>
            
            <div class="report-actions animate-slide-up" style="animation-delay: 0.5s">
                <button class="btn btn-success" onclick="exportToExcel()">
                    <i class="fas fa-file-excel"></i> Excel-ге экспорттау
                </button>
                <button class="btn btn-primary" onclick="saveReportToDatabase()">
                    <i class="fas fa-save"></i> Есепті сақтау
                </button>
                <button class="btn btn-secondary" onclick="window.print()">
                    <i class="fas fa-print"></i> Басып шығару
                </button>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// Графиктік есеп
function showChartReport(container, attendance, students, subjects, studentId, subjectId, groupName, startDate, endDate) {
    let filteredAttendance = [...attendance];
    let filteredStudents = [...students];
    
    if (groupName !== 'all') {
        const groupStudentIds = students
            .filter(s => s.group_name === groupName)
            .map(s => s.id);
        filteredAttendance = filteredAttendance.filter(a => groupStudentIds.includes(a.student_id));
        filteredStudents = filteredStudents.filter(s => s.group_name === groupName);
    }
    
    if (studentId !== 'all') {
        filteredAttendance = filteredAttendance.filter(a => a.student_id == studentId);
    }
    
    if (subjectId !== 'all') {
        filteredAttendance = filteredAttendance.filter(a => a.subject_id == subjectId);
    }
    
    if (filteredAttendance.length === 0) {
        container.innerHTML = `
            <div class="empty-state animate-pop">
                <i class="fas fa-chart-bar"></i>
                <h3>Деректер жоқ</h3>
                <p>Таңдалған кезеңде қатысу деректері жоқ</p>
                <button class="btn btn-primary" onclick="generateReport()">
                    <i class="fas fa-sync-alt"></i> Қайта іздеу
                </button>
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="report-content">
            <div class="report-header-animate">
                <h2 class="report-main-title">
                    <i class="fas fa-chart-bar"></i> 
                    Графиктік есеп
                    <small>${new Date().toLocaleDateString('kk-KZ')}</small>
                </h2>
                <div class="report-badge">📈 График</div>
            </div>
            
            <div class="report-filters-info animate-slide">
                ${groupName !== 'all' ? `<span class="filter-badge"><i class="fas fa-users"></i> Топ: ${groupName}</span>` : ''}
                ${studentId !== 'all' ? `<span class="filter-badge"><i class="fas fa-user-graduate"></i> ${getStudentName(students, studentId)}</span>` : ''}
                ${subjectId !== 'all' ? `<span class="filter-badge"><i class="fas fa-book"></i> ${getSubjectName(subjects, subjectId)}</span>` : ''}
                <span class="filter-badge"><i class="fas fa-calendar"></i> ${startDate || '?'} - ${endDate || '?'}</span>
            </div>
    `;
    
    const dates = [...new Set(filteredAttendance.map(a => a.date))].sort();
    
    html += '<h3 class="section-title"><i class="fas fa-calendar-alt"></i> Күндер бойынша қатысу</h3>';
    html += '<div class="chart-container animate-scale">';
    
    dates.forEach((date, index) => {
        const dayAttendance = filteredAttendance.filter(a => a.date === date);
        const dayPresent = dayAttendance.filter(a => a.status === 'present').length;
        const dayLate = dayAttendance.filter(a => a.status === 'late').length;
        const dayAbsent = dayAttendance.filter(a => a.status === 'absent').length;
        const dayTotal = dayAttendance.length;
        
        const presentPercent = dayTotal > 0 ? (dayPresent / dayTotal * 100).toFixed(1) : 0;
        const latePercent = dayTotal > 0 ? (dayLate / dayTotal * 100).toFixed(1) : 0;
        
        html += `
            <div class="chart-row animate-slide-up" style="animation-delay: ${index * 0.1}s">
                <div class="chart-date">${date}</div>
                <div class="chart-bars">
                    <div class="bar-stack">
                        <div class="bar present" style="width: 0%" data-width="${presentPercent}%" title="Қатысты: ${dayPresent}"></div>
                        <div class="bar late" style="width: 0%" data-width="${latePercent}%" title="Кешікті: ${dayLate}"></div>
                    </div>
                    <div class="bar-values">
                        <span style="color: #4cc9f0;">${dayPresent}</span>
                        <span style="color: #f8961e;">${dayLate}</span>
                        <span style="color: #f72585;">${dayAbsent}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    html += '<h3 class="section-title"><i class="fas fa-user-graduate"></i> Студенттер бойынша қатысу</h3>';
    html += '<div class="chart-container animate-scale">';
    
    filteredStudents.forEach((student, index) => {
        const studentAttendance = filteredAttendance.filter(a => a.student_id === student.id);
        if (studentAttendance.length === 0) return;
        
        const studPresent = studentAttendance.filter(a => a.status === 'present').length;
        const studLate = studentAttendance.filter(a => a.status === 'late').length;
        const studAbsent = studentAttendance.filter(a => a.status === 'absent').length;
        const studTotal = studentAttendance.length;
        
        const presentPercent = (studPresent / studTotal * 100).toFixed(1);
        const latePercent = (studLate / studTotal * 100).toFixed(1);
        
        html += `
            <div class="chart-row animate-slide-up" style="animation-delay: ${index * 0.1}s">
                <div class="chart-label">
                    <div class="student-avatar" style="width: 30px; height: 30px;">${student.name.charAt(0)}</div>
                    <span>${student.name}</span>
                </div>
                <div class="chart-bars">
                    <div class="bar-stack">
                        <div class="bar present" style="width: 0%" data-width="${presentPercent}%" title="Қатысты: ${studPresent}"></div>
                        <div class="bar late" style="width: 0%" data-width="${latePercent}%" title="Кешікті: ${studLate}"></div>
                    </div>
                    <div class="bar-values">
                        <span style="color: #4cc9f0;">${studPresent}</span>
                        <span style="color: #f8961e;">${studLate}</span>
                        <span style="color: #f72585;">${studAbsent}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    html += `
        <div class="chart-legend animate-pop">
            <span><span class="legend-color" style="background: #4cc9f0;"></span> Қатысты</span>
            <span><span class="legend-color" style="background: #f8961e;"></span> Кешікті</span>
            <span><span class="legend-color" style="background: #f72585;"></span> Қатыспады</span>
        </div>
        
        <div class="report-actions animate-slide-up">
            <button class="btn btn-success" onclick="exportToExcel()">
                <i class="fas fa-file-excel"></i> Excel-ге экспорттау
            </button>
            <button class="btn btn-primary" onclick="saveReportToDatabase()">
                <i class="fas fa-save"></i> Есепті сақтау
            </button>
            <button class="btn btn-secondary" onclick="window.print()">
                <i class="fas fa-print"></i> Басып шығару
            </button>
        </div>
    `;
    
    container.innerHTML = html;
    
    setTimeout(() => {
        animateProgressBars();
    }, 100);
}

// Анимация функциялары
function animateCounters() {
    const counters = document.querySelectorAll('.counter');
    
    counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-target'));
        let current = 0;
        const increment = target / 50;
        
        const updateCounter = () => {
            if (current < target) {
                current += increment;
                counter.textContent = Math.ceil(current);
                setTimeout(updateCounter, 10);
            } else {
                counter.textContent = target;
            }
        };
        
        updateCounter();
    });
}

function animateProgressBars() {
    const progressFills = document.querySelectorAll('.progress-fill[data-width]');
    
    progressFills.forEach(fill => {
        const width = fill.getAttribute('data-width');
        setTimeout(() => {
            fill.style.width = width;
        }, 200);
    });
}

// Есепті сақтау
window.saveReportToDatabase = function() {
    const now = new Date();
    const almatyTime = now.toLocaleString('kk-KZ', { timeZone: 'Asia/Almaty' });
    
    const reportData = {
        timestamp: almatyTime,
        filters: {
            studentId: document.getElementById('reportStudent')?.value || 'all',
            subjectId: document.getElementById('reportSubject')?.value || 'all',
            groupName: document.getElementById('reportGroup')?.value || 'all',
            startDate: document.getElementById('reportStartDate')?.value || '',
            endDate: document.getElementById('reportEndDate')?.value || '',
            reportType: document.getElementById('reportType')?.value || 'summary'
        },
        data: currentReportData
    };
    
    const savedReports = JSON.parse(localStorage.getItem('savedReports') || '[]');
    savedReports.push({
        id: Date.now(),
        name: `Есеп ${almatyTime}`,
        data: reportData
    });
    localStorage.setItem('savedReports', JSON.stringify(savedReports));
    
    showToast('💾 Есеп сәтті сақталды!', 'success');
};

// Excel-ге экспорттау
window.exportToExcel = function() {
    const { attendance, students, subjects } = currentReportData;
    
    if (attendance.length === 0) {
        showToast('❌ Экспорттау үшін деректер жоқ', 'error');
        return;
    }
    
    let csv = 'Күн,Студент,Топ,Пән,Статус\n';
    
    attendance.forEach(a => {
        const student = students.find(s => s.id === a.student_id);
        const subject = subjects.find(s => s.id === a.subject_id);
        
        if (student && subject) {
            const statusText = {
                'present': 'Қатысты',
                'late': 'Кешікті',
                'absent': 'Қатыспады'
            }[a.status];
            
            csv += `"${a.date}","${student.name}","${student.group_name}","${subject.name}","${statusText}"\n`;
        }
    });
    
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.href = url;
    link.download = `qatysu_esebi_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    URL.revokeObjectURL(url);
    showToast('📥 Excel файлы жүктелді!', 'success');
};

// Көмекші функциялар
function getStudentName(students, studentId) {
    if (studentId === 'all') return 'Барлық студенттер';
    const student = students.find(s => s.id == studentId);
    return student ? student.name : 'Белгісіз';
}

function getSubjectName(subjects, subjectId) {
    if (subjectId === 'all') return 'Барлық пәндер';
    const subject = subjects.find(s => s.id == subjectId);
    return subject ? subject.name : 'Белгісіз';
}

// Батырмаларды орнату
document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generateReportBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateReport);
    }
});