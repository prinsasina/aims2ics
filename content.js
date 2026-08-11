function extractCourseSchedule() {
    const courses = [];
    const allTables = document.querySelectorAll('table.datadisplaytable');
    
    for (let i = 0; i < allTables.length; i++) {
        const table = allTables[i];
        const caption = table.querySelector('caption.captiontext');
        
        if (!caption) continue;
        
        const captionText = caption.textContent.trim();
        
        if (captionText === 'Scheduled Meeting Times') continue;
        
        const hasCRN = table.textContent.includes('CRN:');
        const hasCredits = table.textContent.includes('Credits:');
        
        if (!hasCRN || !hasCredits) continue;
        
        const courseData = {
            title: captionText,
            details: {},
            meetings: []
        };
        
        const rows = table.querySelectorAll('tr');
        rows.forEach(row => {
            const label = row.querySelector('th.ddlabel');
            const value = row.querySelector('td.dddefault');
            if (label && value) {
                const key = label.textContent.trim().replace(':', '');
                courseData.details[key] = value.textContent.trim();
            }
        });
        
        let meetingTable = null;
        let nextTable = table.nextElementSibling;
        let searchCount = 0;
        
        while (nextTable && searchCount < 20) {
            if (nextTable.tagName === 'TABLE') {
                const meetingCaption = nextTable.querySelector('caption.captiontext');
                if (meetingCaption && meetingCaption.textContent.trim() === 'Scheduled Meeting Times') {
                    meetingTable = nextTable;
                    break;
                }
            }
            nextTable = nextTable.nextElementSibling;
            searchCount++;
        }
        
        if (meetingTable) {
            const meetingRows = meetingTable.querySelectorAll('tr');
            let isHeader = true;
            
            meetingRows.forEach(row => {
                if (isHeader) { 
                    isHeader = false; 
                    return; 
                }
                const cells = row.querySelectorAll('td.dddefault');
                
                if (cells.length >= 4) {
                    const meeting = {
                        type: cells[0]?.textContent.trim() || '',
                        time: cells[1]?.textContent.trim() || '',
                        days: cells[2]?.textContent.trim() || '',
                        location: cells[3]?.textContent.trim() || '',
                        dateRange: cells[4]?.textContent.trim() || '',
                        scheduleType: cells[5]?.textContent.trim() || '',
                        instructors: cells[6]?.textContent.trim() || ''
                    };
                    courseData.meetings.push(meeting);
                }
            });
        }
        
        if (courseData.meetings.length > 0) courses.push(courseData);
    }

    return courses;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getSchedule') {
        try {
            const data = extractCourseSchedule();
            sendResponse({ 
                success: true, 
                data: data,
                count: data.length
            });
        } catch (error) {
            console.error('Error extracting schedule:', error);
            sendResponse({ 
                success: false, 
                error: error.message 
            });
        }
    }
    return true;
});