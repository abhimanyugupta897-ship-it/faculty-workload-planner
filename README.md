# Faculty Workload Planner

CA2 Project-Based Assessment, Problem Statement #10.

A simple web app that helps a college department give courses to teachers and keep track of each teacher's workload.

**GitHub repository:** https://github.com/abhimanyugupta897-ship-it/faculty-workload-planner  
**Live site:** [add GitHub Pages link]  
**Video presentation:** [add video link]

## Team

| Name | Registration No. |
|---|---|
| Abhimanyu Sah | 12618222 |
| Satish Mahato | 12618221 |
| Shadab Akhtar | 12618009 |

## Problem

Department workload allocation may become difficult when teaching hours and responsibilities change frequently.

## Features

- Dashboard with totals and a workload bar for each teacher
- Faculty profiles with designation and weekly workload limit
- Courses with semester, workload units, day and time slot
- Allocation of courses to teachers
- Warnings for overload and for two courses at the same time
- Semester view with a weekly timetable
- Summary report downloaded as a CSV file
- Admin login: only the admin can add, edit, delete or allocate

## Technologies

HTML5, CSS3, JavaScript (no libraries). Data is saved in the browser using localStorage. Hosted on GitHub Pages.

## How to run

1. Download or clone this repository.
2. Open `index.html` in a browser.

## Admin login (demo)

- Username: `admin`
- Password: `admin123`

Without login the app is read-only. This login is a demo check inside the JavaScript file and is not real security.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page structure, five views and the popup forms |
| `style.css` | Design and layout, including the mobile view |
| `script.js` | Data, warning rules, rendering, forms and actions |

## Limitations

- Data is stored only in one browser and is not shared between devices.
- Each course has one teacher.
- Time clashes are checked for each teacher only.
