//Form Submissions:
//
// The code attaches event listeners to three forms with the IDs "add-apnt3", "ratingForm", and "contactingForm".
// When a form is submitted, the code prevents the default form submission behavior using event.preventDefault().
// It retrieves the form data using FormData and sends a POST request to the specified URL using fetch().
// The request body contains the form data serialized as JSON.
// Depending on the response status, it displays success or error notifications using SweetAlert.
// After a successful submission, the code resets the form using form.reset().
document.getElementById('add-apnt3').addEventListener('submit', async (event) => {
    event.preventDefault(); // Prevent the default form submission

    const form = event.target;
    const formData = new FormData(form);

    try {
        const response = await fetch('/online-appointment-booking', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ formData: Object.fromEntries(formData) }),
        });

        if (response.ok) {
            // Display success SweetAlert notification here
            Swal.fire('Success', 'Appointment booked successfully!', 'success');
            form.reset(); // Optional: Reset the form after successful submission
        } else {
            // Display error SweetAlert notification here
            Swal.fire('Error', 'Failed to book appointment', 'error');
        }
    } catch (error) {
        console.error('Error saving appointment:', error);
        // Display error SweetAlert notification here
        Swal.fire('Error', 'Internal server error', 'error');
    }
});


//Date and Time Selection:
//
// The code adds event listeners to the date input field with the ID "date3" and the time input field with the ID "time3".
// When the date input changes, it disables or enables the time input field based on whether a date is selected.
// Clicking on the date input clears both the date and time input fields.
document.getElementById('ratingForm').addEventListener('submit', async (event) => {
    event.preventDefault(); // Prevent the default form submission

    const form = event.target;
    const formData = new FormData(form);

    try {
        const response = await fetch('/rate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ formData: Object.fromEntries(formData) }),
        });

        if (response.ok) {
            // Display success SweetAlert notification here
            Swal.fire('Thank You', 'Review sent successfully!', 'success');
            form.reset(); // Optional: Reset the form after successful submission
        } else {
            // Display error SweetAlert notification here
            Swal.fire('Error', 'Failed to send review', 'error');
        }
    } catch (error) {
        console.error('Error sending review:', error);
        // Display error SweetAlert notification here
        Swal.fire('Error', 'Internal server error', 'error');
    }
})


document.getElementById('contactingForm').addEventListener('submit', async (event) => {
    event.preventDefault(); // Prevent the default form submission

    const form = event.target;
    const formData = new FormData(form);

    try {
        const response = await fetch('/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ formData: Object.fromEntries(formData) }),
        });

        if (response.ok) {
            // Display success SweetAlert notification here
            Swal.fire('Thank You', 'We will contact you as soon as possible!', 'success');
            form.reset(); // Optional: Reset the form after successful submission
        } else {
            // Display error SweetAlert notification here
            Swal.fire('Error', 'Failed to send contact request', 'error');
        }
    } catch (error) {
        console.error('Error sending contact request:', error);
        // Display error SweetAlert notification here
        Swal.fire('Error', 'Internal server error', 'error');
    }
})


//Appointment Availability:
//
// The code processes an array of found appointments and converts it into an object structure that represents the availability of appointments grouped by date and time.
// The converted appointments object contains a nested structure with dates, times, and time slots.
// The availability information is used to disable or enable specific hours and timeslots based on whether they are already booked or not.
const dateInpt = document.getElementById('date3');
const timeInpt = document.getElementById('time3');
dateInpt.addEventListener('input', () => {
    if (dateInpt.value) {
        timeInpt.removeAttribute('disabled');
    } else {
        timeInpt.setAttribute('disabled', 'disabled');
    }
});

dateInpt.addEventListener('click', () => {
    timeInpt.value = ''; // Clear the time input
    dateInpt.value = ''; // Clear the date input
});

const convertedAppointments = foundAppointments.reduce((result, appointment) => {
    const {date, time} = appointment;
    if (!result[date]) {
        result[date] = {
            time: [], timeSlots: {
                "09:00": false,
                "10:00": false,
                "11:00": false,
                "12:00": false,
                "13:00": false,
                "14:00": false,
                "15:00": false,
                "16:00": false,
                "17:00": false,
            }
        };
    }
    result[date].time.push(time);
    const hour = time.slice(0, 2) + ':00';
    result[date].timeSlots[hour] = result[date].time.filter(t => t.slice(0, 2) === hour.slice(0, 2)).length === 12;
    return result;
}, {});

const timeInput = document.getElementById('time3');
const dateInput = document.getElementById('date3');
const overlay = document.querySelector('.ovLay');
const hours = document.querySelectorAll('.hour');
const timeslotsContainer = document.querySelector('.timeslots');

// Add click event listener to time input
timeInput.addEventListener('click', function () {
    overlay.style.display = 'block';
});
// Add change event listener to date input
dateInput.addEventListener('change', function () {
    // Disable hours for dates that have appointments booked
    const selectedDate = this.value;
    const bookedTimeslots = convertedAppointments[selectedDate] ? convertedAppointments[selectedDate].timeSlots : null;
    hours.forEach(function (hour) {
        const hourValue = hour.innerText.slice(0, 2) + ':00';
        if (bookedTimeslots && bookedTimeslots[hourValue]) {
            hour.classList.add('booked');
            hour.style.backgroundColor = 'gray';
            hour.style.cursor = 'not-allowed';
            hour.style.pointerEvents = "none";
            hour.removeEventListener('click', handleHourClick);
        } else {
            hour.style.backgroundColor = '#007bff';
            hour.style.pointerEvents = "auto";
            hour.classList.remove('booked');
            hour.style.cursor = 'pointer';
            hour.addEventListener('click', handleHourClick);
        }
    });
});


//Time Slot Selection:
//
// The code adds event listeners to the time input field with the ID "time3".
// Clicking on the time input field displays an overlay.
// Changing the date input field disables specific hours based on the availability of appointments for the selected date.
// Clicking on an available hour triggers a function handleHourClick().
// The handleHourClick() function hides the hour selection, generates timeslots for the selected hour, and displays them.
// Timeslots are dynamically generated and appended to the timeslots container.
// Booked timeslots are disabled and marked as "booked".
// Clicking on an available timeslot sets the selected time value in the time input field and closes the overlay.
function handleHourClick() {
    hours.forEach(function (hour) {
        hour.addEventListener('click', function () {
            // Hide hours div
            const hoursDiv = document.querySelector('.hours');
            hoursDiv.style.display = 'none';

            // Clear timeslots container
            timeslotsContainer.innerHTML = '';

            // Add back arrow icon
            const backArrow = document.createElement('i');
            backArrow.className = 'fa fa-arrow-left back-arrow';
            backArrow.addEventListener('click', function () {
                timeslotsContainer.style.display = 'none';
                hoursDiv.style.display = 'flex';
                backArrow.style.display = 'none';
            });
            timeslotsContainer.appendChild(backArrow);

            // Get selected hour
            const selectedHour = hour.innerText;

            // Generate timeslots for selected hour
            for (let i = 0; i < 60; i += 5) {
                const hour = selectedHour.substring(0, 2);
                const minute = i < 10 ? '0' + i : i;
                const time = `${hour}:${minute}`;

                const timeslot = document.createElement('div');
                timeslot.classList.add('timeslot');
                timeslot.style.backgroundColor = 'green';
                timeslot.style.color = '#fff';
                timeslot.style.margin = '20px';
                timeslot.style.padding = '5px';
                timeslot.style.borderRadius = '5px';
                timeslot.innerText = time;

                // Disable timeslots for the dates that already have appointments booked
                const selectedDate = dateInput.value;
                const bookedTimes = convertedAppointments[selectedDate] ? convertedAppointments[selectedDate].time : [];
                if (bookedTimes.includes(time)) {
                    timeslot.classList.add('booked');
                    timeslot.style.backgroundColor = 'gray';
                    timeslot.style.cursor = 'not-allowed';
                    timeslot.style.pointerEvents = "none";
                    timeslot.removeEventListener('click', handleClick);
                } else {
                    timeslot.style.pointerEvents = "auto";
                    timeslot.addEventListener('click', handleClick);
                }

                function handleClick() {
                    timeInput.value = time;
                    overlay.style.display = 'none';
                    backArrow.click()
                }

                timeslotsContainer.appendChild(timeslot);
            }

            // Show timeslots container
            timeslotsContainer.style.display = 'flex';
            backArrow.style.display = 'block';
        });
    })
};

//The code handles the closing of the overlay when clicking on an element with the ID "close".
document.getElementById("close").addEventListener("click", function () {
    overlay.style.display = "none";
});


