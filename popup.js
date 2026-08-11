let extractedData = null;

document.addEventListener('DOMContentLoaded', function() {
    const downloadBtn = document.getElementById('downloadIcsBtn');
    
    loadSchedule();

    downloadBtn.addEventListener('click', function() {
        if (extractedData && extractedData.length > 0) {
            generateAndDownloadICS(extractedData);
        } else {
            showError('No course data available. Please refresh the page.');
        }
    });
});

function loadSchedule() {
    const statusDiv = document.getElementById('status');
    const courseList = document.getElementById('courseList');
    const downloadBtn = document.getElementById('downloadIcsBtn');
    
    statusDiv.innerHTML = '<div class="loading"><div class="spinner"></div>Loading schedule...</div>';
    downloadBtn.disabled = true;
    courseList.innerHTML = '';

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (chrome.runtime.lastError) {
            statusDiv.innerHTML = 'Error: ' + chrome.runtime.lastError.message;
            return;
        }
        
        if (!tabs || tabs.length === 0) {
            statusDiv.innerHTML = 'No active tab found.';
            return;
        }
        
        chrome.tabs.sendMessage(tabs[0].id, {action: 'getSchedule'}, function(response) {
            if (chrome.runtime.lastError) {
                statusDiv.innerHTML = 'Error: ' + chrome.runtime.lastError.message + '. Please refresh the page.';
                return;
            }
            
            if (!response) {
                statusDiv.innerHTML = 'No response from page. Make sure you\'re on the Banweb schedule page.';
                return;
            }
            
            if (!response.success) {
                statusDiv.innerHTML = 'Error: ' + (response.error || 'Unknown error');
                return;
            }
            
            extractedData = response.data;
            if (!extractedData || extractedData.length === 0) {
                statusDiv.innerHTML = 'No courses found. Make sure you\'re on the "Student Detail Schedule" page.';
                return;
            }
            
            statusDiv.innerHTML = extractedData.length + ' courses found';

            courseList.innerHTML = '';
            extractedData.forEach((course) => {
                const div = document.createElement('div');
                div.className = 'course-item';
                const credits = parseFloat(course.details['Credits']) || 0;
                const crn = course.details['CRN'] || '';
                const instructor = course.details['Assigned Instructor'] || 'TBA';
                
                let meetingsHtml = '';
                if (course.meetings && course.meetings.length > 0) {
                    course.meetings.forEach((meeting) => {
                        const type = meeting.type || 'Class';
                        const time = meeting.time || 'TBA';
                        const days = meeting.days || 'TBA';
                        const location = meeting.location || 'TBA';
                        const dateRange = meeting.dateRange || '';
                        
                        meetingsHtml += 
                            '<div class="meeting-detail">' +
                            '<span class="meeting-type">' + type + '</span>' +
                            '<span class="meeting-time">' + time + '</span>' +
                            '<span class="meeting-days">' + days + '</span>' +
                            '<span class="meeting-location">' + location + '</span>' +
                            (dateRange ? '<span class="meeting-date">' + dateRange + '</span>' : '') +
                            '</div>';
                    });
                } else {
                    meetingsHtml = '<div class="meeting-detail" style="color:#999;">No meeting times found</div>';
                }
                
                div.innerHTML = 
                    '<div class="course-header">' +
                    '<span class="title">' + course.title + '</span>' +
                    '<span class="course-badge">' + crn + '</span>' +
                    '</div>' +
                    '<div style="font-size:11px;color:#666;margin:4px 0;">' +
                    'Credits: ' + credits.toFixed(3) + ' | Instructor: ' + instructor + 
                    '</div>' +
                    '<div class="meetings-container">' + meetingsHtml + '</div>';
                courseList.appendChild(div);
            });

            downloadBtn.disabled = false;
        });
    });
}

function generateAndDownloadICS(courses) {
    
    try {
        const icsContent = generateICS(courses);
        
        if (!icsContent || !icsContent.includes('BEGIN:VEVENT')) {
            showError('No events were generated. Please check your course data.');
            return;
        }
        
        const eventCount = (icsContent.match(/BEGIN:VEVENT/g) || []).length;
        downloadWithAnchor(icsContent);
        
    } catch (e) {
        showError('Error: ' + e.message);
    }
}

function downloadWithAnchor(icsContent) {
    try {
        const dateStr = new Date().toISOString().slice(0,10);
        const filename = 'course_schedule_' + dateStr + '.ics';
        const blob = new Blob([icsContent], {type: 'text/calendar;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();

        setTimeout(function() {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 5000);
        
        const eventCount = (icsContent.match(/BEGIN:VEVENT/g) || []).length;
        showSuccess('Downloading ' + eventCount + ' events...');
        
    } catch (e) {
        downloadWithDataURI(icsContent);
    }
}

function downloadWithDataURI(icsContent) {
    try {
        const dateStr = new Date().toISOString().slice(0,10);
        const filename = 'course_schedule_' + dateStr + '.ics';
        
        // Encode the content
        const encoded = encodeURIComponent(icsContent);
        const dataUri = 'data:text/calendar;charset=utf-8,' + encoded;
        
        const a = document.createElement('a');
        a.href = dataUri;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        
        setTimeout(function() {
            document.body.removeChild(a);
        }, 2000);
        
        showSuccess('Download started...');
    } catch (e) {
        showError('Download failed. Please try again.');
    }
}

function generateICS(courses) {
    let lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//CityU Course Schedule//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH'
    ];

    let eventCount = 0;

    courses.forEach(course => {
        const crn = course.details['CRN'] || '';
        const credits = parseFloat(course.details['Credits']) || 0;
        const instructor = course.details['Assigned Instructor'] || 'TBA';

        if (!course.meetings || course.meetings.length === 0) {
            return;
        }

        course.meetings.forEach(meeting => {
            const dateRange = parseDateRange(meeting.dateRange);
            if (!dateRange) return;
            
            const timeRange = parseTime(meeting.time);
            if (!timeRange) return;
            
            const days = parseDays(meeting.days);
            if (days.length === 0) return;

            const dayMap = {'M': 1, 'T': 2, 'W': 3, 'R': 4, 'F': 5, 'S': 6, 'U': 0};
            const byDayMap = {'M': 'MO', 'T': 'TU', 'W': 'WE', 'R': 'TH', 'F': 'FR', 'S': 'SA', 'U': 'SU'};
            
            days.forEach(day => {
                const targetDay = dayMap[day];
                if (targetDay === undefined) return;
            
                const startDate = new Date(dateRange.startDate);
                const currentDay = startDate.getDay();
                let diff = targetDay - currentDay;
                if (diff < 0) diff += 7;
                startDate.setDate(startDate.getDate() + diff);
                
                if (startDate < dateRange.startDate) {
                    startDate.setDate(startDate.getDate() + 7);
                }

                const dtStart = formatDateForICal(startDate, timeRange.start);
                const dtEnd = formatDateForICal(startDate, timeRange.end);
                
                const endDateObj = new Date(dateRange.endDate);
                endDateObj.setHours(23, 59, 59);
                const dtEndRecur = formatDateTimeForICal(endDateObj);
                
                const byDay = byDayMap[day];

                const summary = cleanText(course.title + ' (' + crn + ')');
                const location = cleanText(meeting.location || 'TBA');
                const description = cleanText(
                    'Course: ' + course.title + '\n' +
                    'CRN: ' + crn + '\n' +
                    'Type: ' + meeting.type + '\n' +
                    'Credits: ' + credits + '\n' +
                    'Instructor: ' + instructor
                );

                const now = new Date();
                const dtStamp = formatDateTimeForICal(now);

                lines.push('BEGIN:VEVENT');
                lines.push('DTSTART:' + dtStart);
                lines.push('DTEND:' + dtEnd);
                lines.push('SUMMARY:' + summary);
                lines.push('LOCATION:' + location);
                lines.push('DESCRIPTION:' + description);
                lines.push('DTSTAMP:' + dtStamp);
                lines.push('RRULE:FREQ=WEEKLY;BYDAY=' + byDay + ';UNTIL=' + dtEndRecur);
                lines.push('END:VEVENT');
                
                eventCount++;
            });
        });
    });

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
}

function cleanText(text) {
    if (!text) return '';
    return text
        .replace(/[\\,;]/g, '\\$&')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '')
        .trim();
}

function parseDateRange(dateRangeStr) {
    if (!dateRangeStr) return null;
    const parts = dateRangeStr.split(' - ');
    if (parts.length !== 2) return null;
    const startDate = parseDate(parts[0].trim());
    const endDate = parseDate(parts[1].trim());
    if (!startDate || !endDate) return null;
    return { startDate: startDate, endDate: endDate };
}

function parseDate(dateStr) {
    const months = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    const parts = dateStr.split(' ');
    if (parts.length !== 3) return null;
    const month = months[parts[0]];
    const day = parseInt(parts[1].replace(',', ''));
    const year = parseInt(parts[2]);
    if (isNaN(month) || isNaN(day) || isNaN(year)) return null;
    return new Date(year, month, day);
}

function parseTime(timeStr) {
    if (!timeStr || timeStr === 'TBA') return null;
    const parts = timeStr.split(' - ');
    if (parts.length !== 2) return null;
    return {
        start: convertTo24h(parts[0].trim()),
        end: convertTo24h(parts[1].trim())
    };
}

function convertTo24h(timeStr) {
    if (!timeStr) return null;
    const parts = timeStr.split(' ');
    if (parts.length !== 2) return null;
    const timeParts = parts[0].split(':');
    let hours = parseInt(timeParts[0]);
    const minutes = parseInt(timeParts[1]);
    const meridian = parts[1].toLowerCase();
    if (meridian === 'pm' && hours < 12) hours += 12;
    if (meridian === 'am' && hours === 12) hours = 0;
    return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0');
}

function parseDays(daysStr) {
    if (!daysStr) return [];
    return daysStr.split('');
}

function getFirstDayOfWeek(startDate, day) {
    const dayMap = {'M': 1, 'T': 2, 'W': 3, 'R': 4, 'F': 5, 'S': 6, 'U': 0};
    const targetDay = dayMap[day];
    if (targetDay === undefined) return null;
    const date = new Date(startDate);
    const currentDay = date.getDay();
    let diff = targetDay - currentDay;
    if (diff < 0) diff += 7;
    date.setDate(date.getDate() + diff);
    return date;
}

function formatDateForICal(date, time) {
    if (!date || !time) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const timeStr = time.replace(':', '');
    return year + month + day + 'T' + timeStr + '00';
}

function formatDateTimeForICal(date) {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return year + month + day + 'T' + hours + minutes + seconds;
}

function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    errorDiv.style.background = '#ffebee';
    errorDiv.style.color = '#c62828';
    setTimeout(function() {
        errorDiv.style.display = 'none';
    }, 8000);
}

function showSuccess(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    errorDiv.style.background = '#e8f5e9';
    errorDiv.style.color = '#2e7d32';
    setTimeout(function() {
        errorDiv.style.display = 'none';
    }, 8000);
}