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

// Анимация функциялары
function animateCounters() {
    const counters = document.querySelectorAll('.counter');
    
    counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-target'));
        if (isNaN(target)) return;
        
        let current = 0;
        const increment = Math.ceil(target / 50);
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                counter.textContent = target;
                clearInterval(timer);
            } else {
                counter.textContent = current;
            }
        }, 10);
    });
}

function animateProgressBars() {
    // Барлық прогресс барларды анимациялау
    const progressFills = document.querySelectorAll('.progress-fill[data-width]');
    
    progressFills.forEach(fill => {
        const width = fill.getAttribute('data-width');
        if (width) {
            setTimeout(() => {
                fill.style.width = width;
                fill.style.transition = 'width 1s cubic-bezier(0.4, 0, 0.2, 1)';
            }, 200);
        }
    });
    
    // Чарт барларды анимациялау
    const chartBars = document.querySelectorAll('.bar[data-width]');
    chartBars.forEach(bar => {
        const width = bar.getAttribute('data-width');
        if (width) {
            setTimeout(() => {
                bar.style.width = width;
                bar.style.transition = 'width 1s cubic-bezier(0.4, 0, 0.2, 1)';
            }, 200);
        }
    });
}

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
            
            <div class="stats-grid-animate" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
                <div class="report-stat-card total" style="background: linear-gradient(135deg, #f8f9fa, #ffffff); border-radius: 12px; padding: 20px; display: flex; align-items: center; gap: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-left: 4px solid #4361ee; animation: fadeInUp 0.5s ease; animation-delay: 0.1s;">
                    <div class="stat-icon" style="width: 50px; height: 50px; border-radius: 12px; background: rgba(67,97,238,0.1); display: flex; align-items: center; justify-content: center; font-size: 24px; color: #4361ee;"><i class="fas fa-database"></i></div>
                    <div class="stat-details">
                        <span class="stat-value counter" data-target="${totalRecords}" style="font-size: 32px; font-weight: bold; display: block; line-height: 1.2; color: #333;">0</span>
                        <span class="stat-label" style="font-size: 13px; color: #666;">Барлық жазба</span>
                    </div>
                </div>
                <div class="report-stat-card" style="background: linear-gradient(135deg, #f8f9fa, #ffffff); border-radius: 12px; padding: 20px; display: flex; align-items: center; gap: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-left: 4px solid #4cc9f0; animation: fadeInUp 0.5s ease; animation-delay: 0.2s;">
                    <div class="stat-icon" style="width: 50px; height: 50px; border-radius: 12px; background: rgba(76,201,240,0.1); display: flex; align-items: center; justify-content: center; font-size: 24px; color: #4cc9f0;"><i class="fas fa-users"></i></div>
                    <div class="stat-details">
                        <span class="stat-value counter" data-target="${uniqueStudents}" style="font-size: 32px; font-weight: bold; display: block; line-height: 1.2; color: #333;">0</span>
                        <span class="stat-label" style="font-size: 13px; color: #666;">Студенттер</span>
                    </div>
                </div>
                <div class="report-stat-card" style="background: linear-gradient(135deg, #f8f9fa, #ffffff); border-radius: 12px; padding: 20px; display: flex; align-items: center; gap: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-left: 4px solid #f8961e; animation: fadeInUp 0.5s ease; animation-delay: 0.3s;">
                    <div class="stat-icon" style="width: 50px; height: 50px; border-radius: 12px; background: rgba(248,150,30,0.1); display: flex; align-items: center; justify-content: center; font-size: 24px; color: #f8961e;"><i class="fas fa-book"></i></div>
                    <div class="stat-details">
                        <span class="stat-value counter" data-target="${uniqueSubjects}" style="font-size: 32px; font-weight: bold; display: block; line-height: 1.2; color: #333;">0</span>
                        <span class="stat-label" style="font-size: 13px; color: #666;">Пәндер</span>
                    </div>
                </div>
                <div class="report-stat-card present" style="background: linear-gradient(135deg, #f8f9fa, #ffffff); border-radius: 12px; padding: 20px; display: flex; align-items: center; gap: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-left: 4px solid #4cc9f0; animation: fadeInUp 0.5s ease; animation-delay: 0.4s;">
                    <div class="stat-icon" style="width: 50px; height: 50px; border-radius: 12px; background: rgba(76,201,240,0.1); display: flex; align-items: center; justify-content: center; font-size: 24px; color: #4cc9f0;"><i class="fas fa-check-circle"></i></div>
                    <div class="stat-details">
                        <span class="stat-value counter" data-target="${presentCount}" style="font-size: 32px; font-weight: bold; display: block; line-height: 1.2; color: #333;">0</span>
                        <span class="stat-label" style="font-size: 13px; color: #666;">Қатысқан</span>
                    </div>
                </div>
                <div class="report-stat-card late" style="background: linear-gradient(135deg, #f8f9fa, #ffffff); border-radius: 12px; padding: 20px; display: flex; align-items: center; gap: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-left: 4px solid #f8961e; animation: fadeInUp 0.5s ease; animation-delay: 0.5s;">
                    <div class="stat-icon" style="width: 50px; height: 50px; border-radius: 12px; background: rgba(248,150,30,0.1); display: flex; align-items: center; justify-content: center; font-size: 24px; color: #f8961e;"><i class="fas fa-clock"></i></div>
                    <div class="stat-details">
                        <span class="stat-value counter" data-target="${lateCount}" style="font-size: 32px; font-weight: bold; display: block; line-height: 1.2; color: #333;">0</span>
                        <span class="stat-label" style="font-size: 13px; color: #666;">Кешіккен</span>
                    </div>
                </div>
                <div class="report-stat-card absent" style="background: linear-gradient(135deg, #f8f9fa, #ffffff); border-radius: 12px; padding: 20px; display: flex; align-items: center; gap: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border-left: 4px solid #f72585; animation: fadeInUp 0.5s ease; animation-delay: 0.6s;">
                    <div class="stat-icon" style="width: 50px; height: 50px; border-radius: 12px; background: rgba(247,37,133,0.1); display: flex; align-items: center; justify-content: center; font-size: 24px; color: #f72585;"><i class="fas fa-times-circle"></i></div>
                    <div class="stat-details">
                        <span class="stat-value counter" data-target="${absentCount}" style="font-size: 32px; font-weight: bold; display: block; line-height: 1.2; color: #333;">0</span>
                        <span class="stat-label" style="font-size: 13px; color: #666;">Қатыспаған</span>
                    </div>
                </div>
            </div>
            
            <div class="report-progress-section animate-scale" style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
                <h3 style="font-size: 16px; color: #333; margin-bottom: 15px;"><i class="fas fa-chart-line" style="color: #4361ee; margin-right: 8px;"></i> Жалпы қатысу көрсеткіші</h3>
                <div class="report-progress-bar" style="height: 30px; background: #e9ecef; border-radius: 15px; overflow: hidden; position: relative;">
                    <div class="progress-fill" style="width: 0%; height: 100%; background: linear-gradient(90deg, #4361ee, #4cc9f0); display: flex; align-items: center; justify-content: flex-end; padding-right: 15px; transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);" data-width="${presentPercent}%">
                        <span class="progress-text" style="color: white; font-size: 14px; font-weight: 500;">${presentPercent}%</span>
                    </div>
                </div>
            </div>
    `;
    
    // Пәндер бойынша қатысу
    html += '<h3 class="section-title" style="font-size: 18px; color: #333; margin: 30px 0 20px;"><i class="fas fa-book-open" style="color: #4361ee; margin-right: 8px;"></i> Пәндер бойынша қатысу</h3>';
    html += '<div class="subjects-stats" style="display: grid; gap: 15px;">';
    
    let delay = 0.7;
    filteredSubjects.forEach(subject => {
        const subjectAttendance = filteredAttendance.filter(a => a.subject_id === subject.id);
        if (subjectAttendance.length === 0) return;
        
        const subPresent = subjectAttendance.filter(a => a.status === 'present').length;
        const subLate = subjectAttendance.filter(a => a.status === 'late').length;
        const subAbsent = subjectAttendance.filter(a => a.status === 'absent').length;
        const subTotal = subjectAttendance.length;
        const subPercent = subTotal > 0 ? ((subPresent + subLate * 0.5) / subTotal * 100).toFixed(1) : '0';
        
        html += `
            <div class="subject-stat-card animate-slide-up" style="background: #f8f9fa; border-radius: 10px; padding: 15px; border: 1px solid #f0f0f0; transition: all 0.3s ease; animation: slideInUp 0.5s ease; animation-delay: ${delay}s;">
                <div class="subject-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h4 style="font-size: 16px; color: #333;"><i class="fas fa-book" style="color: #4361ee; margin-right: 8px;"></i> ${subject.name}</h4>
                    <span class="subject-total" style="font-size: 13px; color: #666; background: #e9ecef; padding: 4px 10px; border-radius: 20px;">${subTotal} сабақ</span>
                </div>
                <div class="subject-stats">
                    <div class="stat-row" style="display: flex; gap: 15px; margin-bottom: 10px;">
                        <span><i class="fas fa-check-circle" style="color: #4cc9f0;"></i> ${subPresent}</span>
                        <span><i class="fas fa-clock" style="color: #f8961e;"></i> ${subLate}</span>
                        <span><i class="fas fa-times-circle" style="color: #f72585;"></i> ${subAbsent}</span>
                    </div>
                    <div class="progress-bar" style="height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden; margin: 10px 0;">
                        <div class="progress-fill" style="width: 0%; height: 100%; background: linear-gradient(90deg, #4361ee, #4cc9f0); transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);" data-width="${subPercent}%"></div>
                    </div>
                    <div class="percent-value" style="font-weight: bold; color: ${subPercent > 70 ? '#4cc9f0' : (subPercent > 50 ? '#f8961e' : '#f72585')}; text-align: right;">
                        ${subPercent}%
                    </div>
                </div>
            </div>
        `;
        delay += 0.1;
    });
    
    html += '</div>';
    
    // Студенттер бойынша қатысу
    html += '<h3 class="section-title" style="font-size: 18px; color: #333; margin: 30px 0 20px;"><i class="fas fa-user-graduate" style="color: #4361ee; margin-right: 8px;"></i> Студенттер бойынша қатысу</h3>';
    html += '<div class="students-stats" style="display: grid; gap: 15px; max-height: 500px; overflow-y: auto; padding-right: 10px;">';
    
    filteredStudents.forEach(student => {
        const studentAttendance = filteredAttendance.filter(a => a.student_id === student.id);
        if (studentAttendance.length === 0) return;
        
        const studPresent = studentAttendance.filter(a => a.status === 'present').length;
        const studLate = studentAttendance.filter(a => a.status === 'late').length;
        const studAbsent = studentAttendance.filter(a => a.status === 'absent').length;
        const studTotal = studentAttendance.length;
        const studPercent = studTotal > 0 ? ((studPresent + studLate * 0.5) / studTotal * 100).toFixed(1) : '0';
        
        html += `
            <div class="student-stat-card animate-slide-up" style="background: #f8f9fa; border-radius: 10px; padding: 15px; border: 1px solid #f0f0f0; transition: all 0.3s ease; animation: slideInUp 0.5s ease; animation-delay: ${delay}s;">
                <div class="student-info" style="display: flex; align-items: center; gap: 12px; margin-bottom: 10px;">
                    <div class="student-avatar" style="width: 40px; height: 40px; background: linear-gradient(135deg, #4361ee, #3f37c9); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px;">${student.name.charAt(0)}</div>
                    <div class="student-details">
                        <div class="student-name" style="font-weight: 600; color: #333; font-size: 15px;">${student.name}</div>
                        <div class="student-group" style="font-size: 12px; color: #666;">${student.group_name}</div>
                    </div>
                </div>
                <div class="student-stats">
                    <div class="stats-badges" style="display: flex; gap: 10px; margin-bottom: 10px;">
                        <span class="badge present" style="background: rgba(76, 201, 240, 0.1); color: #4cc9f0; padding: 4px 10px; border-radius: 20px; font-size: 12px;"><i class="fas fa-check-circle"></i> ${studPresent}</span>
                        <span class="badge late" style="background: rgba(248, 150, 30, 0.1); color: #f8961e; padding: 4px 10px; border-radius: 20px; font-size: 12px;"><i class="fas fa-clock"></i> ${studLate}</span>
                        <span class="badge absent" style="background: rgba(247, 37, 133, 0.1); color: #f72585; padding: 4px 10px; border-radius: 20px; font-size: 12px;"><i class="fas fa-times-circle"></i> ${studAbsent}</span>
                    </div>
                    <div class="progress-bar" style="height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden; margin: 10px 0;">
                        <div class="progress-fill" style="width: 0%; height: 100%; background: linear-gradient(90deg, #4361ee, #4cc9f0); transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);" data-width="${studPercent}%"></div>
                    </div>
                    <div class="percent-value" style="font-weight: bold; color: ${studPercent > 70 ? '#4cc9f0' : (studPercent > 50 ? '#f8961e' : '#f72585')}; text-align: right;">
                        ${studPercent}%
                    </div>
                </div>
            </div>
        `;
        delay += 0.1;
    });
    
    html += '</div></div>';
    
    html += `
        <div class="report-actions animate-slide-up" style="display: flex; gap: 15px; justify-content: flex-end; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; animation: slideInUp 0.5s ease; animation-delay: 1.5s;">
            <button class="btn btn-success" onclick="exportToExcel()" style="padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #4cc9f0, #4895ef); color: white; box-shadow: 0 4px 10px rgba(76,201,240,0.3);">
                <i class="fas fa-file-excel"></i> Excel-ге экспорттау
            </button>
            <button class="btn btn-primary" onclick="saveReportToDatabase()" style="padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #4361ee, #3f37c9); color: white; box-shadow: 0 4px 10px rgba(67,97,238,0.3);">
                <i class="fas fa-save"></i> Есепті сақтау
            </button>
            <button class="btn btn-secondary" onclick="window.print()" style="padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; display: inline-flex; align-items: center; gap: 8px; background: #e9ecef; color: #495057;">
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
                <h2 class="report-main-title" style="font-size: 24px; color: #333; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #f0f0f0;">
                    <i class="fas fa-list" style="color: #4361ee; margin-right: 10px;"></i> 
                    Толық қатысу тізімі
                    <small style="font-size: 14px; color: #999; margin-left: 10px;">${new Date().toLocaleDateString('kk-KZ')}</small>
                </h2>
                <div class="report-badge" style="display: inline-block; padding: 4px 12px; background: linear-gradient(135deg, #4361ee, #3f37c9); color: white; border-radius: 20px; font-size: 12px; font-weight: 500; margin-left: 10px;">📋 Толық тізім</div>
            </div>
            
            <div class="report-filters-info animate-slide" style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 25px;">
                ${groupName !== 'all' ? `<span class="filter-badge" style="background: #f8f9fa; padding: 8px 15px; border-radius: 20px; font-size: 13px; color: #4361ee; border: 1px solid #e0e0e0; display: inline-flex; align-items: center; gap: 5px;"><i class="fas fa-users"></i> Топ: ${groupName}</span>` : ''}
                ${studentId !== 'all' ? `<span class="filter-badge" style="background: #f8f9fa; padding: 8px 15px; border-radius: 20px; font-size: 13px; color: #4361ee; border: 1px solid #e0e0e0; display: inline-flex; align-items: center; gap: 5px;"><i class="fas fa-user-graduate"></i> ${getStudentName(students, studentId)}</span>` : ''}
                ${subjectId !== 'all' ? `<span class="filter-badge" style="background: #f8f9fa; padding: 8px 15px; border-radius: 20px; font-size: 13px; color: #4361ee; border: 1px solid #e0e0e0; display: inline-flex; align-items: center; gap: 5px;"><i class="fas fa-book"></i> ${getSubjectName(subjects, subjectId)}</span>` : ''}
                <span class="filter-badge" style="background: #f8f9fa; padding: 8px 15px; border-radius: 20px; font-size: 13px; color: #4361ee; border: 1px solid #e0e0e0; display: inline-flex; align-items: center; gap: 5px;"><i class="fas fa-calendar"></i> ${startDate || '?'} - ${endDate || '?'}</span>
            </div>
            
            <div class="detailed-table-container animate-scale" style="overflow-x: auto; margin: 20px 0; background: white; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                <table class="detailed-table" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th style="background: #4361ee; color: white; padding: 15px; text-align: left; font-weight: 500;">№</th>
                            <th style="background: #4361ee; color: white; padding: 15px; text-align: left; font-weight: 500;">Күн</th>
                            <th style="background: #4361ee; color: white; padding: 15px; text-align: left; font-weight: 500;">Студент</th>
                            <th style="background: #4361ee; color: white; padding: 15px; text-align: left; font-weight: 500;">Топ</th>
                            <th style="background: #4361ee; color: white; padding: 15px; text-align: left; font-weight: 500;">Пән</th>
                            <th style="background: #4361ee; color: white; padding: 15px; text-align: left; font-weight: 500;">Статус</th>
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
            <tr class="table-row-animate" style="animation: fadeIn 0.3s ease; animation-delay: ${index * 0.05}s; transition: background 0.3s ease;">
                <td style="padding: 15px; border-bottom: 1px solid #e0e0e0; color: #666;">${index + 1}</td>
                <td style="padding: 15px; border-bottom: 1px solid #e0e0e0; color: #666;">${record.date}</td>
                <td style="padding: 15px; border-bottom: 1px solid #e0e0e0;">
                    <div class="student-info" style="display: flex; align-items: center; gap: 10px;">
                        <div class="student-avatar" style="width: 35px; height: 35px; background: linear-gradient(135deg, #4361ee, #3f37c9); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">${student.name.charAt(0)}</div>
                        <span style="color: #333;">${student.name}</span>
                    </div>
                </td>
                <td style="padding: 15px; border-bottom: 1px solid #e0e0e0;"><span class="student-group-badge" style="background: #e9ecef; padding: 4px 12px; border-radius: 20px; font-size: 12px; color: #495057; display: inline-flex; align-items: center; gap: 5px;">${student.group_name}</span></td>
                <td style="padding: 15px; border-bottom: 1px solid #e0e0e0; color: #666;">${subject.name}</td>
                <td style="padding: 15px; border-bottom: 1px solid #e0e0e0;"><span class="status-badge ${statusClass}" style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; background: ${record.status === 'present' ? '#d4edda' : (record.status === 'late' ? '#fff3cd' : '#f8d7da')}; color: ${record.status === 'present' ? '#155724' : (record.status === 'late' ? '#856404' : '#721c24')};"><i class="fas ${statusIcon}"></i> ${statusText}</span></td>
            </tr>
        `;
    });
    
    html += `
                    </tbody>
                </table>
            </div>
            
            <div class="table-footer animate-slide-up" style="text-align: right; padding: 15px; background: #f8f9fa; border-radius: 8px; margin-top: 20px;">
                <p style="color: #666;">📊 Барлығы: <strong style="color: #4361ee;">${filteredAttendance.length}</strong> жазба</p>
            </div>
            
            <div class="report-actions animate-slide-up" style="display: flex; gap: 15px; justify-content: flex-end; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; animation: slideInUp 0.5s ease; animation-delay: 0.5s;">
                <button class="btn btn-success" onclick="exportToExcel()" style="padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #4cc9f0, #4895ef); color: white; box-shadow: 0 4px 10px rgba(76,201,240,0.3);">
                    <i class="fas fa-file-excel"></i> Excel-ге экспорттау
                </button>
                <button class="btn btn-primary" onclick="saveReportToDatabase()" style="padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #4361ee, #3f37c9); color: white; box-shadow: 0 4px 10px rgba(67,97,238,0.3);">
                    <i class="fas fa-save"></i> Есепті сақтау
                </button>
                <button class="btn btn-secondary" onclick="window.print()" style="padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; display: inline-flex; align-items: center; gap: 8px; background: #e9ecef; color: #495057;">
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
                <h2 class="report-main-title" style="font-size: 24px; color: #333; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #f0f0f0;">
                    <i class="fas fa-chart-bar" style="color: #4361ee; margin-right: 10px;"></i> 
                    Графиктік есеп
                    <small style="font-size: 14px; color: #999; margin-left: 10px;">${new Date().toLocaleDateString('kk-KZ')}</small>
                </h2>
                <div class="report-badge" style="display: inline-block; padding: 4px 12px; background: linear-gradient(135deg, #4361ee, #3f37c9); color: white; border-radius: 20px; font-size: 12px; font-weight: 500; margin-left: 10px;">📈 График</div>
            </div>
            
            <div class="report-filters-info animate-slide" style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 25px;">
                ${groupName !== 'all' ? `<span class="filter-badge" style="background: #f8f9fa; padding: 8px 15px; border-radius: 20px; font-size: 13px; color: #4361ee; border: 1px solid #e0e0e0; display: inline-flex; align-items: center; gap: 5px;"><i class="fas fa-users"></i> Топ: ${groupName}</span>` : ''}
                ${studentId !== 'all' ? `<span class="filter-badge" style="background: #f8f9fa; padding: 8px 15px; border-radius: 20px; font-size: 13px; color: #4361ee; border: 1px solid #e0e0e0; display: inline-flex; align-items: center; gap: 5px;"><i class="fas fa-user-graduate"></i> ${getStudentName(students, studentId)}</span>` : ''}
                ${subjectId !== 'all' ? `<span class="filter-badge" style="background: #f8f9fa; padding: 8px 15px; border-radius: 20px; font-size: 13px; color: #4361ee; border: 1px solid #e0e0e0; display: inline-flex; align-items: center; gap: 5px;"><i class="fas fa-book"></i> ${getSubjectName(subjects, subjectId)}</span>` : ''}
                <span class="filter-badge" style="background: #f8f9fa; padding: 8px 15px; border-radius: 20px; font-size: 13px; color: #4361ee; border: 1px solid #e0e0e0; display: inline-flex; align-items: center; gap: 5px;"><i class="fas fa-calendar"></i> ${startDate || '?'} - ${endDate || '?'}</span>
            </div>
    `;
    
    // Күндер бойынша диаграмма
    const dates = [...new Set(filteredAttendance.map(a => a.date))].sort();
    
    html += '<h3 class="section-title" style="font-size: 18px; color: #333; margin: 30px 0 20px;"><i class="fas fa-calendar-alt" style="color: #4361ee; margin-right: 8px;"></i> Күндер бойынша қатысу</h3>';
    html += '<div class="chart-container animate-scale" style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); margin: 20px 0;">';
    
    dates.forEach((date, index) => {
        const dayAttendance = filteredAttendance.filter(a => a.date === date);
        const dayPresent = dayAttendance.filter(a => a.status === 'present').length;
        const dayLate = dayAttendance.filter(a => a.status === 'late').length;
        const dayAbsent = dayAttendance.filter(a => a.status === 'absent').length;
        const dayTotal = dayAttendance.length;
        
        const presentPercent = dayTotal > 0 ? (dayPresent / dayTotal * 100).toFixed(1) : 0;
        const latePercent = dayTotal > 0 ? (dayLate / dayTotal * 100).toFixed(1) : 0;
        const absentPercent = dayTotal > 0 ? (dayAbsent / dayTotal * 100).toFixed(1) : 0;
        
        html += `
            <div class="chart-row animate-slide-up" style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px; padding: 10px; background: #f8f9fa; border-radius: 8px; animation: slideInUp 0.5s ease; animation-delay: ${index * 0.1}s;">
                <div class="chart-date" style="min-width: 100px; font-weight: 600; color: #4361ee;">${date}</div>
                <div class="chart-bars" style="flex: 1;">
                    <div class="bar-stack" style="height: 30px; display: flex; border-radius: 6px; overflow: hidden; margin-bottom: 5px;">
                        <div class="bar present" style="width: 0%; background: #4cc9f0; transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);" data-width="${presentPercent}%" title="Қатысты: ${dayPresent}"></div>
                        <div class="bar late" style="width: 0%; background: #f8961e; transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);" data-width="${latePercent}%" title="Кешікті: ${dayLate}"></div>
                        <div class="bar absent" style="width: 0%; background: #f72585; transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);" data-width="${absentPercent}%" title="Қатыспады: ${dayAbsent}"></div>
                    </div>
                    <div class="bar-values" style="display: flex; justify-content: space-between; font-size: 12px;">
                        <span style="color: #4cc9f0;"><i class="fas fa-check-circle"></i> ${dayPresent}</span>
                        <span style="color: #f8961e;"><i class="fas fa-clock"></i> ${dayLate}</span>
                        <span style="color: #f72585;"><i class="fas fa-times-circle"></i> ${dayAbsent}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    // Студенттер бойынша диаграмма
    html += '<h3 class="section-title" style="font-size: 18px; color: #333; margin: 30px 0 20px;"><i class="fas fa-user-graduate" style="color: #4361ee; margin-right: 8px;"></i> Студенттер бойынша қатысу</h3>';
    html += '<div class="chart-container animate-scale" style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); margin: 20px 0;">';
    
    filteredStudents.forEach((student, index) => {
        const studentAttendance = filteredAttendance.filter(a => a.student_id === student.id);
        if (studentAttendance.length === 0) return;
        
        const studPresent = studentAttendance.filter(a => a.status === 'present').length;
        const studLate = studentAttendance.filter(a => a.status === 'late').length;
        const studAbsent = studentAttendance.filter(a => a.status === 'absent').length;
        const studTotal = studentAttendance.length;
        
        const presentPercent = (studPresent / studTotal * 100).toFixed(1);
        const latePercent = (studLate / studTotal * 100).toFixed(1);
        const absentPercent = (studAbsent / studTotal * 100).toFixed(1);
        
        html += `
            <div class="chart-row animate-slide-up" style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px; padding: 10px; background: #f8f9fa; border-radius: 8px; animation: slideInUp 0.5s ease; animation-delay: ${index * 0.1}s;">
                <div class="chart-label" style="min-width: 200px; display: flex; align-items: center; gap: 10px;">
                    <div class="student-avatar" style="width: 35px; height: 35px; background: linear-gradient(135deg, #4361ee, #3f37c9); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px;">${student.name.charAt(0)}</div>
                    <span style="font-weight: 600; color: #333;">${student.name}</span>
                </div>
                <div class="chart-bars" style="flex: 1;">
                    <div class="bar-stack" style="height: 30px; display: flex; border-radius: 6px; overflow: hidden; margin-bottom: 5px;">
                        <div class="bar present" style="width: 0%; background: #4cc9f0; transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);" data-width="${presentPercent}%" title="Қатысты: ${studPresent}"></div>
                        <div class="bar late" style="width: 0%; background: #f8961e; transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);" data-width="${latePercent}%" title="Кешікті: ${studLate}"></div>
                        <div class="bar absent" style="width: 0%; background: #f72585; transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);" data-width="${absentPercent}%" title="Қатыспады: ${studAbsent}"></div>
                    </div>
                    <div class="bar-values" style="display: flex; justify-content: space-between; font-size: 12px;">
                        <span style="color: #4cc9f0;"><i class="fas fa-check-circle"></i> ${studPresent}</span>
                        <span style="color: #f8961e;"><i class="fas fa-clock"></i> ${studLate}</span>
                        <span style="color: #f72585;"><i class="fas fa-times-circle"></i> ${studAbsent}</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    html += `
        <div class="chart-legend animate-pop" style="display: flex; justify-content: center; gap: 30px; margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px;">
            <span><span class="legend-color" style="display: inline-block; width: 12px; height: 12px; background: #4cc9f0; border-radius: 3px; margin-right: 5px;"></span> Қатысты</span>
            <span><span class="legend-color" style="display: inline-block; width: 12px; height: 12px; background: #f8961e; border-radius: 3px; margin-right: 5px;"></span> Кешікті</span>
            <span><span class="legend-color" style="display: inline-block; width: 12px; height: 12px; background: #f72585; border-radius: 3px; margin-right: 5px;"></span> Қатыспады</span>
        </div>
        
        <div class="report-actions animate-slide-up" style="display: flex; gap: 15px; justify-content: flex-end; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <button class="btn btn-success" onclick="exportToExcel()" style="padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #4cc9f0, #4895ef); color: white; box-shadow: 0 4px 10px rgba(76,201,240,0.3);">
                <i class="fas fa-file-excel"></i> Excel-ге экспорттау
            </button>
            <button class="btn btn-primary" onclick="saveReportToDatabase()" style="padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #4361ee, #3f37c9); color: white; box-shadow: 0 4px 10px rgba(67,97,238,0.3);">
                <i class="fas fa-save"></i> Есепті сақтау
            </button>
            <button class="btn btn-secondary" onclick="window.print()" style="padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; display: inline-flex; align-items: center; gap: 8px; background: #e9ecef; color: #495057;">
                <i class="fas fa-print"></i> Басып шығару
            </button>
        </div>
    `;
    
    container.innerHTML = html;
    
    setTimeout(() => {
        animateProgressBars();
    }, 100);
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

// Анимациялар үшін CSS стильдерін қосу
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes slideInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }
    
    @keyframes scaleIn {
        from {
            opacity: 0;
            transform: scale(0.9);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }
    
    .animate-slide-up {
        animation: slideInUp 0.5s ease forwards;
    }
    
    .animate-scale {
        animation: scaleIn 0.5s ease forwards;
    }
    
    .animate-pop {
        animation: scaleIn 0.3s ease forwards;
    }
    
    .fade-in {
        animation: fadeIn 0.3s ease forwards;
    }
    
    .report-stat-card {
        transition: all 0.3s ease;
    }
    
    .report-stat-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 30px rgba(67, 97, 238, 0.2);
    }
    
    .subject-stat-card:hover,
    .student-stat-card:hover {
        transform: translateX(5px);
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        border-color: #4361ee;
    }
    
    .filter-badge {
        transition: all 0.3s ease;
    }
    
    .filter-badge:hover {
        background: #4361ee;
        color: white;
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(67, 97, 238, 0.3);
    }
    
    .btn {
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
    }
    
    .btn:hover {
        transform: translateY(-2px);
    }
    
    .btn::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.3);
        transform: translate(-50%, -50%);
        transition: width 0.6s, height 0.6s;
    }
    
    .btn:hover::before {
        width: 300px;
        height: 300px;
    }
    
    .btn-pulse {
        animation: pulse 1s ease;
    }
    
    @keyframes pulse {
        0% {
            transform: scale(1);
        }
        50% {
            transform: scale(1.05);
        }
        100% {
            transform: scale(1);
        }
    }
`;
document.head.appendChild(style);
