const successNotification = document.getElementById('successe-notification');

const sidebarToggleBtn = document.getElementById('sidebar-toggle-btn');

//Toggling Sidebar Mini
sidebarToggleBtn.addEventListener('click', async function () {
    try {
        // Get the current value of the hidden input
        const sidebarMiniInput = document.querySelector('input[name="sidebarMini"]');
        const sidebarMiniValue = sidebarMiniInput.value;

        // Toggle the value of the hidden input
        const newSidebarMiniValue = sidebarMiniValue === 'true' ? 'false' : 'true';
        sidebarMiniInput.value = newSidebarMiniValue;

        // Send a fetch request to update the sidebarMini property
        const response = await fetch('/update-sidebar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({sidebarMini: sidebarMiniValue}),
        });

        const updatedValues = await response.json();

        console.log('sidebarMini:', updatedValues.sidebarMini);
        if (updatedValues.sidebarMini === true) {
            document.getElementById('sidebarDiv').classList.add('sidebar-mini');
        } else {
            document.getElementById('sidebarDiv').classList.remove('sidebar-mini');
        }
    } catch (error) {
        console.error(error);
    }
});


//Theme Toggle
//This code block handles the click event on the theme toggle button. When clicked, it fetches the current theme value from the HTML element, toggles the theme value (light/dark), and sends a fetch request to update the theme on the server. The response is then used to update the theme value on the frontend by setting the data-theme attribute of the HTML element. Any errors that occur during this process are caught and logged.
document.getElementById('theme-toggle').addEventListener('click', async () => {
    console.log('clicked')
    try {
        await new Promise((resolve) => setTimeout(resolve, 10)); // Add a 500ms delay

        const htmlElement = document.querySelector('html');
        const currentTheme = htmlElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        console.log("currentTheme= " + currentTheme)
        console.log("newTheme= " + newTheme)

        const response = await fetch('/update-theme', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({themeValue: newTheme}), // Use 'themeValue' key
        });

        const updatedValues = await response.json();

        // Apply the updated theme value to the frontend
        htmlElement.setAttribute('data-theme', updatedValues.themeValue);

        // console.log('Theme value updated:', updatedValues.themeValue);
    } catch (err) {
        console.error(err);
        // Handle error
    }
});

//This code block is triggered when the window loads. It fetches the user's theme preference from the server, processes the retrieved data, and performs operations based on the theme preferences. The retrieved theme values are used to update various elements and apply specific styles. The console log statement outputs the retrieved data.
window.addEventListener('load', function () {
// Fetch user theme preference from server
    fetch('/user/theme')
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            console.log(data)
            let themeColor = data.theme.theme;
            let themeType = data.theme.themeValue
            let themeRtl = data.theme.themeRtl
            let hMenu = data.theme.h_menu
            let pageHeader = data.theme.headerFixed
            let pageHeaderDark = data.theme.headerDarkMode
            let borderRadios = data.theme.borderRadios
            let sidebarDark = data.theme.sidebarDark
            let checkImage = data.theme.checkImage
            let fluidLayout = data.theme.fluidLayout
            let cardShadow = data.theme.cardShadow
            let sidebarMini = data.theme.sidebarMini
            let pic = data.theme.pic
            const themeRtlCheckbox = document.querySelector('.theme-rtl input#theme-rtl');
            const hMenuCheckbox = document.querySelector('.h-menu-switch input#h_menu');
            const pageHeaderCheckbox = document.querySelector('.pageheader-switch input#PageHeader');
            const pageHeaderDarkCheckbox = document.querySelector('.pageheader-dark-switch input#PageHeader_dark');
            const borderRadiosCheckbox = document.querySelector('.radius-switch input#BorderRadius');
            const sidebarCheckbox = document.querySelector('.sidebardark-switch input#SidebarDark');
            const fluidLayoutCheckbox = document.querySelector('.fluid-switch input#FluidLayout');
            const checkImageCheckbox = document.querySelector('.imagebg-switch input#CheckImage');
            const cardShadowCheckbox = document.querySelector('.shadow-switch input#Card_shadow');
            const bgImagesbox = document.querySelector('#bg-images');
            const sidebarDiv = document.querySelector('#sidebarDiv');
            const htmlEl = document.querySelector('html.no-js');
            const body = document.querySelector('body');
            const header = document.querySelector('header');
            const sidebar = document.querySelector('.sidebar');
            const containersFluid = Array.from(document.querySelectorAll('.container-fluid'));
            const cardShadowDivs = Array.from(document.querySelectorAll('.card'));
            console.log(themeType)
            htmlEl.setAttribute('data-theme', themeType);
            hMenuCheckbox.addEventListener('click', () => {
                sidebarDiv.classList.remove("sidebar-img-bg");
                bgImagesbox.classList.remove("show")
                checkImageCheckbox.checked = false;
            });
            if (hMenu === true) {
                sidebarMini = false
                sidebar.classList.remove('sidebar-mini')
                hMenuCheckbox.checked = true;
                body.classList.add("h-menu")
            } else {
                hMenuCheckbox.checked = false;
                body.classList.remove("h-menu")
            }
            if (themeRtl === true) {
                themeRtlCheckbox.checked = true;
                body.classList.add("rtl_mode")
            } else {
                themeRtlCheckbox.checked = false;
                body.classList.remove("rtl_mode")
            }
            if (pageHeader === true) {
                pageHeaderCheckbox.checked = true;
                header.classList.add("sticky-top")

            } else {
                pageHeaderCheckbox.checked = false;
                header.classList.remove("sticky-top")

            }
            if (pageHeaderDark === true) {
                pageHeaderDarkCheckbox.checked = true;
                header.classList.add("dark")

            } else {
                pageHeaderDarkCheckbox.checked = false;
                header.classList.remove("dark")

            }
            if (borderRadios === 1) {
                borderRadiosCheckbox.checked = true;
                body.classList.add("radius-0")

            } else {
                borderRadiosCheckbox.checked = 0;
                body.classList.remove("radius-0")
            }
            if (sidebarDark === true) {
                sidebarCheckbox.checked = true;
                sidebar.classList.add("dark")
            } else {
                sidebarCheckbox.checked = false;
                sidebar.classList.remove("dark")
            }
            if (sidebarMini === true) {
                sidebar.classList.add("sidebar-mini")
            } else {
                sidebar.classList.remove("sidebar-mini")
            }
            if (fluidLayout === true) {
                fluidLayoutCheckbox.checked = true;
                containersFluid.forEach(containerFluid => {
                    containerFluid.classList.toggle('container-fluid', true);
                    containerFluid.classList.toggle('container', false);
                });
            } else {
                fluidLayoutCheckbox.checked = false;
                containersFluid.forEach(containerFluid => {
                    containerFluid.classList.toggle('container-fluid', false);
                    containerFluid.classList.toggle('container', true);
                });
            }
            if (cardShadow === true) {
                cardShadowCheckbox.checked = true;
                cardShadowDivs.forEach(cardShadowDiv => {
                    cardShadowDiv.classList.add('shadow-active');
                });
            } else {
                cardShadowCheckbox.checked = false;
                cardShadowDivs.forEach(cardShadowDiv => {
                    cardShadowDiv.classList.remove('shadow-active');
                });
            }
            if (checkImage === true) {
                checkImageCheckbox.checked = true;
                sidebarDiv.classList.add("sidebar-img-bg")
                bgImagesbox.classList.add("show")
                htmlEl.setAttribute('style', `--sidebar-img: url(/assets/img/sidebar-${pic}.jpg);`);
            } else {
                checkImageCheckbox.checked = false;
                sidebarDiv.classList.remove("sidebar-img-bg")
                bgImagesbox.classList.remove("show")
                htmlEl.removeAttribute('style');
            }

            // Apply user theme preference
            // document.documentElement.setAttribute('data-theme', themeType);

        });
});


//Search Input
//This code block handles the functionality of a search input. It listens to events such as focus, keyup, and click. When the input is focused, it hides the table rows and search results. On keyup, it retrieves the keyword from the input, compares it with the content in the table rows, and shows/hides rows accordingly. Clicking outside the search input clears the input field and hides the table rows.
$(document).ready(function () {
    let $searchInput = $('.main-search input');
    let $patientsSearchResults = $('#patientsSearchResults');
    let $table = $('#myOtherTable');
    let $tableRows = $('#myOtherTable tbody tr');

    // Event listener for the search input focus
    $searchInput.on('focus', function () {
        $tableRows.hide(); // Hide all rows when the input is clicked
        $patientsSearchResults.hide(); //
    });

    // Event listener for the search input keyup
    $searchInput.on('keyup', function () {
        var keyword = $(this).val().toLowerCase();
        $patientsSearchResults.show();

        $tableRows.each(function () {
            var fullName = $(this).find('td:nth-child(2)').text().toLowerCase();
            var age = $(this).find('td:nth-child(3)').text().toLowerCase();

            if (keyword === '') {
                $tableRows.hide(); // Hide all rows if the input is empty
            } else if (fullName.includes(keyword) || age.includes(keyword)) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });
    });

    // Event listener for clicking outside the search input
    $(document).on('click', function (event) {
        if (!$(event.target).closest('.main-search').length) {
            $searchInput.val(''); // Clear the input field
            $tableRows.hide(); // Hide all rows
        }
    });
});

//This code block handles the selection of an image. It updates the value of a hidden input field, removes the "sidebar-img-active" class from all <li> elements, and adds the class to the clicked <li> element.
function selectImage(pic) {
    // Set the selected image value in the hidden input field
    document.getElementById("picInput").value = pic;

    // Remove the "sidebar-img-active" class from all <li> elements
    const liElements = document.querySelectorAll(".list-unstyled li");
    liElements.forEach(li => {
        li.classList.remove("sidebar-img-active");
        // Add the "sidebar-img-active" class to the clicked <li> element
        const selectedLi = document.querySelector(`.sidebar-img-${pic}`);
        selectedLi.classList.remove("sidebar-img-active");
    });

    // Add the "sidebar-img-active" class to the clicked <li> element
    const selectedLi = document.querySelector(`.sidebar-img-${pic}`);
    selectedLi.classList.add("sidebar-img-active");
}


//Update Theme
//This code block manages the theme selection functionality. It updates the value of the hidden input field based on the checked state of checkboxes. The lastChecked variable keeps track of the last selected theme. There are event listeners for the change event on different theme checkboxes, and when triggered, it sets the appropriate theme value in the hidden input field.
let lastChecked = null;
function updateTheme(checkbox, id) {
    if (checkbox.checked) {
        // document.documentElement.setAttribute('data-' + id, checkbox.value);
        document.getElementById('theme-value').value = checkbox.value;
        lastChecked = id;
    } else {
        // document.documentElement.setAttribute('data-' + id, 'light');
        // document.getElementById('theme-value').value = checkbox.value;
        document.getElementById('theme-value').value = 'light';
    }
}

document.getElementById('theme-switch').onchange = function () {
    if (this.checked) {
        lastChecked = 'dark';
        console.log(lastChecked)
        document.getElementById('theme-value').value = lastChecked;
    } else document.getElementById('theme-value').value = "light";

}

document.getElementById('theme-dark').onchange = function () {
    if (this.checked) {
        lastChecked = 'theme-dark';
        console.log(lastChecked)
        document.getElementById('theme-value').value = lastChecked;

    } else document.getElementById('theme-value').value = "light";
}

document.getElementById('theme-high-contrast').onchange = function () {
    if (this.checked) {
        lastChecked = 'high-contrast';
        console.log(lastChecked)
        document.getElementById('theme-value').value = lastChecked;

    } else document.getElementById('theme-value').value = "light";
}



// Get the list of color options
const chooseSkin = document.querySelector('.choose-skin');
const colorOptions = chooseSkin.querySelectorAll('li');
// Add event listeners to each color option
colorOptions.forEach((option) => {
    option.addEventListener('click', () => {
        // Uncheck previously selected option
        const checkedOption = chooseSkin.querySelector('li.active');
        checkedOption.classList.remove('active');
        checkedOption.querySelector('input').checked = false;

        // Check newly selected option
        option.classList.add('active');
        option.querySelector('input').checked = true;
    });
});



//Removes the row associated with the given appointmentID from the DOM.
function remove_deleted_appointment(appointmentID) {
    const row = document.querySelector(`#appointment_${appointmentID}`);
    row.remove();
}

//Removes the row associated with the given invoiceID from the DOM.
function remove_deleted_invoice(invoiceID) {
    const row = document.querySelector(`.invRowRmv_${invoiceID}`);
    row.remove();
}

//Removes the row associated with the given drugID from the DOM.
function remove_deleted_drug(drugID) {
    const row = document.querySelector(`#drug_${drugID}`);
    row.remove();
}

// Removes the row associated with the given reviewID from the DOM.
function remove_deleted_review(reviewID) {
    const row = document.querySelector(`#review_${reviewID}`);
    row.remove();
}

//Removes the row associated with the given personID from the DOM.
function remove_deleted_contact(personID) {
    const row = document.querySelector(`#person_${personID}`);
    row.remove();
}


//This function displays a confirmation dialog using the swal library. If the user confirms the deletion, an AJAX request is made to the server to delete the appointment associated with the appointmentID. If the deletion is successful, a success notification is displayed, and the remove_deleted_appointment function is called to remove the corresponding row from the DOM.
function deleteButton(form, patientName, appointmentID) {
    swal({
        title: "Warning!",
        content: {
            element: "div",
            attributes: {
                innerHTML: `Are you sure you want to delete <strong style="color: red">${patientName}'s</strong> appointment?`
            }
        },
        icon: "warning",
        buttons: true,
        dangerMode: false,
    }).then(function (isOkay) {
        if (isOkay) {
            fetch(`/delete-appointment/${appointmentID}`, {
                method: 'DELETE'
            })
                .then(response => {
                    console.log("Response received");
                    return response.json();
                })
                .then(data => {
                    console.log("Data received");
                    if (data.success) {
                        displaySuccessNotification(`Appointment for <strong><span class="patient-name">${patientName}</span></strong> was deleted successfully.`);

                        remove_deleted_appointment(appointmentID)
                    }
                })
                .catch(error => {
                    console.log("Error occurred:", error);
                    // handle any errors
                });
        }
    });
    return false;
}

//Displays a confirmation dialog to delete the invoice associated with the invoiceID. If confirmed, an AJAX request is made to the server to delete the invoice. If the deletion is successful, a success notification is displayed, and the remove_deleted_invoice function is called to remove the corresponding row from the DOM.
function deleteInvoice(invoiceName, invoiceID) {
    swal({
        title: "Are you sure?",
        text: "you want to delete the invoice?",
        icon: "warning",
        buttons: true,
        dangerMode: true,
    }).then(function (isOkay) {
        if (isOkay) {
            fetch(`/delete-invoice/${invoiceID}`, {
                method: 'DELETE'
            })
                .then(response => {
                    console.log("Response received");
                    return response.json();
                })
                .then(data => {
                    console.log("Data received");
                    if (data.success) {
                        displaySuccessNotification(`Invoice for <strong><span class="patient-name">${invoiceName}</span></strong> was deleted successfully.`);

                        remove_deleted_invoice(invoiceID)
                    }
                })
                .catch(error => {
                    console.log("Error occurred:", error);
                    // handle any errors
                });
        }
    });
    return false;
}


//Displays a confirmation dialog to delete the review associated with the reviewID. If confirmed, an AJAX request is made to the server to delete the review. If the deletion is successful, a success notification is displayed, and the remove_deleted_review function is called to remove the corresponding row from the DOM.
function deleteReview(reviewName, reviewID) {
    swal({
        title: "Warning!",
        content: {
            element: "div",
            attributes: {
                innerHTML: `Are you sure you want to delete <strong style="color: red">${reviewName}'s</strong> review?`
            }
        },
        icon: "warning",
        buttons: true,
        dangerMode: false,
    }).then(function (isOkay) {
        if (isOkay) {
            fetch(`/delete-review/${reviewID}`, {
                method: 'DELETE'
            })
                .then(response => {
                    console.log("Response received");
                    return response.json();
                })
                .then(data => {
                    console.log("Data received");
                    if (data.success) {
                        displaySuccessNotification(`Review for <strong><span class="patient-name">${reviewName}</span></strong> was deleted successfully.`);

                        remove_deleted_review(reviewID)
                    }
                })
                .catch(error => {
                    console.log("Error occurred:", error);
                    // handle any errors
                });
        }
    });
    return false;
}

//Displays a confirmation dialog to delete the contact request associated with the contactID. If confirmed, an AJAX request is made to the server to delete the contact request. If the deletion is successful, a success notification is displayed, and the remove_deleted_contact function is called to remove the corresponding row from the DOM.
function deleteContact(contactName, contactID) {
    swal({
        title: "Warning!",
        content: {
            element: "div",
            attributes: {
                innerHTML: `Are you sure you want to delete <strong style="color: red">${contactName}'s</strong> contact request?`
            }
        },
        icon: "warning",
        buttons: true,
        dangerMode: false,
    }).then(function (isOkay) {
        if (isOkay) {
            fetch(`/delete-contact/${contactID}`, {
                method: 'DELETE'
            })
                .then(response => {
                    console.log("Response received");
                    return response.json();
                })
                .then(data => {
                    console.log("Data received");
                    if (data.success) {
                        displaySuccessNotification(`Contact request for <strong><span class="patient-name">${contactName}</span></strong> was deleted successfully.`);

                        remove_deleted_contact(contactID)
                    }
                })
                .catch(error => {
                    console.log("Error occurred:", error);
                    // handle any errors
                });
        }
    });
    return false;
}

//Displays a confirmation dialog to delete the patient associated with the patientID. If confirmed, an AJAX request is made to the server to delete the patient. If the deletion is successful, the page is redirected to the "/patients" URL.
function deletePatient(patientName, patientID) {
    swal({
        title: "Warning!",
        content: {
            element: "div",
            attributes: {
                innerHTML: `Are you sure you want to delete <strong style="color: red">${patientName}</strong> completly? <br> <strong style="color: red">You will not be able to retrieve it again!</strong>`
            }
        },
        icon: "warning",
        buttons: true,
        dangerMode: false,
    }).then(function (isOkay) {
        if (isOkay) {
            fetch(`/delete-patient/${patientID}`, {
                method: 'DELETE'
            })
                .then(response => {
                    console.log("Response received");
                    return response.json();
                })
                .then(data => {
                    console.log("Data received");
                    if (data.success) {
                        window.location.href = "/patients";
                    }
                })
                .catch(error => {
                    console.log("Error occurred:", error);
                    // handle any errors
                });
        }
    });
    return false;
}

//Displays a confirmation dialog to activate the review associated with the reviewID. If confirmed, an AJAX request is made to the server to activate the review. If the activation is successful, a success notification is displayed, the remove_deleted_review function is called to remove the corresponding row from the DOM, and the page is reloaded.
function activeReview(reviewName, reviewID) {
    swal({
        title: "Warning!",
        content: {
            element: "div",
            attributes: {
                innerHTML: `Are you sure you want to active <strong style="color: red">${reviewName}'s</strong> review?`
            }
        },
        icon: "warning",
        buttons: true,
        dangerMode: false,
    }).then(function (isOkay) {
        if (isOkay) {
            fetch(`/active-review/${reviewID}`, {
                method: 'POST'
            })
                .then(response => {
                    console.log("Response received");
                    return response.json();
                })
                .then(data => {
                    console.log("Data received");
                    if (data.success) {
                        displaySuccessNotification(`Review for <strong><span class="patient-name">${reviewName}</span></strong> was activated successfully.`);

                        remove_deleted_review(reviewID)
                        location.reload();
                    }
                })
                .catch(error => {
                    console.log("Error occurred:", error);
                    // handle any errors
                });
        }
    });
    return false;
}


// This function displays a confirmation dialog using the swal library. If the user confirms, it sends a POST request to deactivate a review using the fetch API. If the request is successful, it displays a success notification and performs additional actions like removing the deleted review from the UI and reloading the page.
function inactiveReview(reviewName, reviewID) {
    swal({
        title: "Warning!",
        content: {
            element: "div",
            attributes: {
                innerHTML: `Are you sure you want to inactive <strong style="color: red">${reviewName}'s</strong> review?`
            }
        },
        icon: "warning",
        buttons: true,
        dangerMode: false,
    }).then(function (isOkay) {
        if (isOkay) {
            fetch(`/active-review/${reviewID}`, {
                method: 'POST'
            })
                .then(response => {
                    console.log("Response received");
                    return response.json();
                })
                .then(data => {
                    console.log("Data received");
                    if (data.success) {
                        displaySuccessNotification(`Review for <strong><span class="patient-name">${reviewName}</span></strong> was inactivated successfully.`);

                        remove_deleted_review(reviewID)
                        location.reload();
                    }
                })
                .catch(error => {
                    console.log("Error occurred:", error);
                    // handle any errors
                });
        }
    });
    return false;
}


//This function displays a confirmation dialog using the swal library. If the user confirms, it sends a DELETE request to delete a drug using the fetch API. If the request is successful, it displays a success notification and removes the deleted drug from the UI.
function deleteDrug(drugName, drugID) {
    swal({
        title: "Warning!",
        content: {
            element: "div",
            attributes: {
                innerHTML: `Are you sure you want to delete <strong style="color: red">${drugName}</strong> drug?`
            }
        },
        icon: "warning",
        buttons: true,
        dangerMode: false,
    }).then(function (isOkay) {
        if (isOkay) {
            fetch(`/delete-drug/${drugID}`, {
                method: 'DELETE'
            })
                .then(response => {
                    console.log("Response received");
                    return response.json();
                })
                .then(data => {
                    console.log("Data received");
                    if (data.success) {
                        displaySuccessNotification(`Drug for <strong><span class="patient-name">${drugName}</span></strong> was deleted successfully.`);

                        remove_deleted_drug(drugID)
                    }
                })
                .catch(error => {
                    console.log("Error occurred:", error);
                    // handle any errors
                });
        }
    });
    return false;
}

//This function displays a confirmation dialog using the swal library. If the user confirms, it sends a DELETE request to delete a past appointment using the fetch API. If the request is successful, it displays a success notification and removes the deleted appointment from the UI.
function deletePast(form, patientName, appointmentID) {
    swal({
        title: "Warning!",
        content: {
            element: "div",
            attributes: {
                innerHTML: `Are you sure you want to delete <strong style="color: red">${patientName}'s</strong> appointment?`
            }
        },
        icon: "warning",
        buttons: true,
        dangerMode: false,
    }).then(function (isOkay) {
        if (isOkay) {
            fetch(`/del-past-appointment/${appointmentID}`, {
                method: 'DELETE'
            })
                .then(response => {
                    console.log("Response received");
                    return response.json();
                })
                .then(data => {
                    console.log("Data received");
                    if (data.success) {
                        displaySuccessNotification(`Appointment for <strong><span class="patient-name">${patientName}</span></strong> was deleted successfully.`);

                        remove_deleted_appointment(appointmentID)
                    }
                })
                .catch(error => {
                    console.log("Error occurred:", error);
                    // handle any errors
                });
        }
    });
    return false;
}


//This function creates a success notification element and appends it to the document body. The notification is removed after a certain timeout.
function displaySuccessNotification(message) {
    const notificationId = Date.now(); // generate a unique id
    const notification = document.createElement('div');
    notification.id = `notification-${notificationId}`;
    notification.setAttribute('role', 'alert'); // set the role attribute using setAttribute method
    notification.className = 'alert alert-success success-notification';
    notification.innerHTML = message;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.opacity = 0;
        setTimeout(() => {
            notification.parentNode.removeChild(notification); // remove the notification element from the DOM
        }, 1000);
    }, 4000);
}


//This function is called when an "edit" button is clicked. It allows the user to edit the fields in a table row by setting the contenteditable attribute to true. It also handles showing and hiding buttons for updating the appointment.
function editButton(appointmentID, button) {
    const row = button.closest("tr");
    var cells = row.getElementsByTagName("td");
    for (var i = 0; i < cells.length - 1; i++) {
        cells[i].setAttribute("contenteditable", "true");
        button.style.display = "none"
        document.getElementById(`${appointmentID}_updateBtn`).style.display = "inline-block"
        cells[0].focus();
    }
}



//This function is called when an "update" button is clicked. It retrieves the appointment data from the server using a GET request and fills the form fields with the data for editing.
function updateButton(appointmentID, button) {
    const form = document.getElementById("add-apnt");
    const row = button.closest("tr");
    const appointmentURL = `/api/appointments/${appointmentID}`;

    fetch(appointmentURL)
        .then(response => response.json())
        .then(appointment => {
            console.log(appointment)
            form.idNumber.value = appointment.idNumber;
            form.fName.value = appointment.fName;
            form.lName.value = appointment.lName;
            form.email.value = appointment.email;
            form.gender.value = appointment.gender;
            form.tel.value = appointment.tel;
            // form.date.value = appointment.date;
            // form.time.value = appointment.time;
            form.service.value = appointment.service;
            form.paragraph.value = appointment.paragraph;

        })
        .catch(error => console.error(error));
}

//This function is called when an "update" button is clicked. It retrieves the drug data from the server using a GET request and fills the form fields with the data for editing.
function updateDrug(drugID, button) {
    const form = document.getElementById("addDrugForm");
    const drugURL = `/api/drug/${drugID}`;

    fetch(drugURL)
        .then(response => response.json())
        .then(drug => {
            console.log(drug)
            form.idNumber.value = drug.idNumber;
            form.drugName.value = drug.drugName;
            form.category.value = drug.category;
            form.companyName.value = drug.companyName;
            form.purchaseDate.value = new Date(drug.purchaseDate).toISOString().substr(0, 10);
            form.expiredDate.value = new Date(drug.expiredDate).toISOString().substr(0, 10);
            form.price.value = drug.price;
            form.stock.value = drug.stock;
            form.description.value = drug.description;

        })
        .catch(error => console.error(error));
}

//This function is called when an "approve" button is clicked. It sets the action of a form and submits it to approve the appointment.
function approveButton(appointmentID, button, patientName) {
    const form = document.getElementById(`deleteAndUpdate_${appointmentID}`);
    const row = button.closest("tr");
    swal({
        title: "Warning!",
        content: {
            element: "div",
            attributes: {
                innerHTML: `Are you sure you want to approve <strong style="color: green">${patientName}'s</strong> appointment?`
            }
        },
        icon: "warning",
        buttons: true,
        dangerMode: false,
    }).then(function (isOkay) {
        if (isOkay) {
            form.action = "/approve-appointment"
            form.onsubmit = "return false;"
            form.submit();
        }
    });
    return false;
}


// Select all rows with the class "deleteRow"
const deleteRows = document.querySelectorAll('.deleteRow');

// Loop through the rows
deleteRows.forEach((row) => {
    let timeoutId;

    // Add a "mousedown" event listener to each row
    row.addEventListener('mousedown', () => {
        // When the mouse button is pressed down, start a timer
        timeoutId = setTimeout(() => {
            // If the mouse button is still pressed down after 500ms,
            // trigger the deleteButton function
            deletePast(row.querySelector('.deleteAndUpdateForm'), row.querySelector('td:nth-child(2)').textContent, row.id.split('_')[1]);
        }, 500);
    });

    // Add a "mouseup" event listener to each row
    row.addEventListener('mouseup', () => {
        // When the mouse button is released, clear the timer
        clearTimeout(timeoutId);
    });

    // Add a "mouseleave" event listener to each row
    row.addEventListener('mouseleave', () => {
        // If the mouse leaves the row before 2 seconds, clear the timer
        clearTimeout(timeoutId);
    });
});



//This function handles the click event for each hour element. It hides the hours div, clears the timeslots container, and generates timeslots for the selected hour. It also disables timeslots for dates that already have appointments booked.
const dateInpt = document.getElementById('date');
const timeInpt = document.getElementById('time');
dateInpt.addEventListener('input', () => {
    if (dateInpt.value) {
        timeInpt.removeAttribute('disabled');
    } else {
        timeInpt.setAttribute('disabled', 'disabled');
    }
});
dateInpt.addEventListener('click', () => {
    timeInpt.value = ''; // Clear the time input
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

const timeInput = document.getElementById('time');
const dateInput = document.getElementById('date');
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

// Handle Booking
// Add click event listener to hours
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

document.getElementById("close").addEventListener("click", function () {
    overlay.style.display = "none";
});


//This function is triggered when an invoice is handled. It retrieves invoice details from the DOM, makes a fetch request to the server to get the invoice data, and updates the invoice template in the DOM with the retrieved data.
function handleInvoice(index) {
    const row = document.getElementById(`invoice-row-${index}`);
    const invoiceID = row.querySelector('input[name="invoiceID"]').value;
    const invoice_id = row.querySelector('input[name="invoice-Id"]').value;
    const totalPrice = row.querySelector('input[name="totalPrice"]').value;
    const amountPaid = row.querySelector('input[name="amountPaid"]').value;
    const due = row.querySelector('input[name="due"]').value;
    const invoiceStatus = row.querySelector('input[name="invoice-status"]').value;
    const invoiceDate = row.querySelector('input[name="invoiceDate"]').value;
    const items = row.querySelector('input[name="items"]').value;

    fetch(`/api/invoices/${invoiceID}`)
        .then(response => response.json())
        .then(data => {
            let foundInvoice = data
            const invoiceTemplate = document.getElementById("invTable");
            document.querySelector("h5#invID").innerText = `Invoice ${foundInvoice.invoiceId}`
            invoiceTemplate.querySelector("#sentInvoice").value = foundInvoice._id
            invoiceTemplate.querySelector("tr td#invDate").innerHTML = ` Invoice <strong>${foundInvoice.invoiceDate}</strong>`
            invoiceTemplate.querySelector("tr td span#invStatus").innerHTML = ` <strong>Status:</strong> ${foundInvoice.status}`
            invoiceTemplate.querySelector("tr td #termsAndCondition").innerText = foundInvoice.terms
            invoiceTemplate.querySelector("tr td #amntPaid").innerText = foundInvoice.amountPaid
            invoiceTemplate.querySelector("tr td #invTotal").innerText = foundInvoice.totalPrice
            invoiceTemplate.querySelector("tr td #balanceDue").innerText = foundInvoice.due
            const itemsTable = document.getElementById("invItemsTable");

            // select only the dynamically added rows and remove them
            const dynamicRows = itemsTable.querySelectorAll("tr.dynamicRow");
            dynamicRows.forEach(row => row.remove());

            let itemsArray = foundInvoice.items
            itemsArray.forEach((item, idx) => {

                const row = document.createElement("tr");
                row.classList.add("dynamicRow")

                // create 6 cells in each row
                const cells = [idx + 1, item.itemName, item.description, item.unitCost, item.quantity, item.unitCost * item.quantity];
                cells.forEach((cell) => {
                    const td = document.createElement("td");
                    td.style.textAlign = "center"; // add the style to the td element
                    td.appendChild(document.createTextNode(cell));
                    row.appendChild(td);
                });

                // add the row to the table immediately after the first row
                itemsTable.insertBefore(row, itemsTable.children[1]);
            });

        })
        .catch(error => {
            console.error(error);
        });
}


//This function is triggered when the user wants to download the invoice. It displays a confirmation dialog using SweetAlert, and if the user confirms, it sets the form action to "/download-pdf" and submits the form.
function downloadInvoice() {
    const form = document.getElementById(`generate-pdf`);
    swal({
        title: "Are you sure?",
        text: "you want to download the invoice?",
        icon: "warning",
        buttons: true,
        dangerMode: false,
    }).then(function (isOkay) {
        if (isOkay) {
            form.action = "/download-pdf"
            form.onsubmit = "return false;"
            form.submit();
        }
    });
    return false;
}

//Server-Sent Events (SSE) to receive updates on the email sending process and displays a success message when the email is sent successfully.
const source = new EventSource('/sse');
const sendPdfButtons = document.querySelectorAll("#generate-pdf .send-pdf-button");
sendPdfButtons.forEach((sendPdfButton) => {
    sendPdfButton.addEventListener("click", async (event) => {
        console.log("clicked")
        // Prevent the default form submission behavior
        event.preventDefault();

        // Show the SweetAlert dialog
        const willSend = await swal({
            title: "Are you sure?",
            text: "Do you really want to send the email?",
            icon: "warning",
            buttons: ["Cancel", "Send"],
            dangerMode: true,
        });

        // If the user clicks the "Send" button in the dialog, submit the form
        if (willSend) {
            const form = sendPdfButton.closest("form");
            form.action = "/generate-pdf";
            form.onsubmit = "return false;";
            form.submit();

            // Listen for the SSE event
            const eventSource = new EventSource('/sse');
            eventSource.onmessage = function (event) {
                if (event.data === 'Email sent successfully') {
                    swal("Success", "Email sent successfully", "success");
                }
            };
        }
    });
});

//This function is triggered when the user wants to send an email with the PDF invoice. It displays a confirmation dialog using SweetAlert, and if the user confirms, it sets the form action to "/generate-pdf" and submits the form. It also listens for Server-Sent Events (SSE) to receive updates on the email sending process and displays a success message when the email is sent successfully.
async function sendPdfButton(btn) {
    console.log("clicked")
    // Prevent the default form submission behavior
    btn.closest("form").addEventListener("submit", function (event) {
        event.preventDefault();
    });

    // Show the SweetAlert dialog
    const willSend = await swal({
        title: "Are you sure?",
        text: "Do you really want to send the email?",
        icon: "warning",
        buttons: ["Cancel", "Send"],
        dangerMode: true,
    });

    // If the user clicks the "Send" button in the dialog, submit the form
    if (willSend) {
        const form = btn.closest("form");
        form.action = "/generate-pdf";
        form.onsubmit = "return false;";
        form.submit();

        // Listen for the SSE event
        const eventSource = new EventSource('/sse');
        eventSource.onmessage = function (event) {
            if (event.data === 'Email sent successfully') {
                swal("Success", "Email sent successfully", "success");
            }
        };
    }
}


//This function populates a review popup with the given review, rater name, and rating.
function populateReview(review, raterName, popupRating) {
    let reviewPopup = document.getElementById('reviewDiv')
    let ratingDiv = document.getElementById('popupRating')
    ratingDiv.innerText = `${raterName} ${popupRating}`;
    reviewPopup.innerText = review;
}


//This function populates a contact popup with the given message and person information.
function populateContact(message, person) {
    let messagePopup = document.getElementById('messageDiv');
    let messageHeader = document.getElementById('popupHead');
    messageHeader.innerText = `${person}`;
    messagePopup.innerText = message;
}

//This function is triggered when the user wants to contact a person. It displays a confirmation dialog using SweetAlert, and if the user confirms, it makes a POST request to the server to initiate the contact request.
function contactPerson(personName, personID) {
    swal({
        title: "Warning!",
        content: {
            element: "div",
            attributes: {
                innerHTML: `Are you sure you want to contact <strong style="color: red">${personName}</strong>?`
            }
        },
        icon: "warning",
        buttons: true,
        dangerMode: false,
    }).then(function (isOkay) {
        if (isOkay) {
            fetch(`/contact-person/${personID}`, {
                method: 'POST'
            })
                .then(response => {
                    console.log("Response received");
                    return response.json();
                })
                .then(data => {
                    console.log("Data received");
                    if (data.success) {
                        displaySuccessNotification(`Contact request for <strong><span class="patient-name">${personName}</span></strong> is ready to contact.`);

                        remove_deleted_contact(personID)
                        location.reload();
                    }
                })
                .catch(error => {
                    console.log("Error occurred:", error);
                    // handle any errors
                });
        }
    });
    return false;
}

//This function is similar to handleInvoice(), but it handles all invoices for a specific patient. It retrieves the invoice details, updates the invoice template in the DOM, and fetches additional patient information to display in the invoice template.
function handleAllInvoices(index, patientID, invID) {
    const row = document.getElementById(`invoice-row-${index}`);
    const invoiceID = row.querySelector('input[name="invoiceID"]').value;
    const invoice_id = row.querySelector('input[name="invoice-Id"]').value;
    const totalPrice = row.querySelector('input[name="totalPrice"]').value;
    const amountPaid = row.querySelector('input[name="amountPaid"]').value;
    const due = row.querySelector('input[name="due"]').value;
    const invoiceStatus = row.querySelector('input[name="invoice-status"]').value;
    const invoiceDate = row.querySelector('input[name="invoiceDate"]').value;
    const items = row.querySelector('input[name="items"]').value;

    fetch(`/api/invoices/${invID}`)
        .then(response => response.json())
        .then(data => {
            let foundInvoice = data;
            const invoiceTemplate = document.getElementById("invoice_detail");
            const invIDElement = invoiceTemplate.querySelector("h5#invID");
            const sentInvoiceElement = invoiceTemplate.querySelector("#sentInvoice");
            invoiceTemplate.querySelector("#patientID").value = patientID;
            const invDateElement = invoiceTemplate.querySelector("td#invDate");
            const invStatusElement = invoiceTemplate.querySelector("span#invStatus");
            const fromDoctorElement = invoiceTemplate.querySelector("#fromDoctor");
            const toPatientElement = invoiceTemplate.querySelector("#toPatient");

            invIDElement.innerText = `Invoice ${foundInvoice.invoiceId}`;
            sentInvoiceElement.value = foundInvoice._id;
            invDateElement.innerHTML = `<strong>${foundInvoice.invoiceDate}</strong>`;
            invStatusElement.innerText = foundInvoice.status;

            invoiceTemplate.querySelector("tr td #amntPaid").innerText = foundInvoice.amountPaid;
            invoiceTemplate.querySelector("tr td #invTotal").innerText = foundInvoice.totalPrice;
            invoiceTemplate.querySelector("tr td #balanceDue").innerText = foundInvoice.due;
            invoiceTemplate.querySelector("tr td #termsAndCondition").innerText = foundInvoice.terms;

            fetch(`/api/patients/${patientID}`)
                .then(response => response.json())
                .then(patient => {
                    let toPatientHTML = `<div>To:</div>`;
                    if (patient && patient.fName && patient.lName) {
                        const maskedFName = patient.fName.slice(0, 2) + patient.fName.slice(2).replace(/./g, '*');
                        const maskedLName = patient.lName.slice(0, 2) + patient.lName.slice(2).replace(/./g, '*');
                        const maskedName = `${maskedFName} ${maskedLName}`;
                        toPatientHTML += `<div class="fs-6 fw-bold mb-1">Name: ${maskedName}</div>`;
                    }

                    if (patient.email) {
                        const [localPart, domainPart] = patient.email.split('@');
                        const maskedLocalPart = localPart.slice(0, 2) + localPart.slice(2).replace(/./g, '*');
                        const maskedEmail = `${maskedLocalPart}@${domainPart}`;
                        toPatientHTML += `<div>Email: ${maskedEmail}</div>`;
                    }

                    if (patient.tel) {
                        const maskedTel = `05${patient.tel.slice(2, 11).replace(/\d/g, '*')}${patient.tel.slice(-2)}`;
                        toPatientHTML += `<div>Phone: ${maskedTel}</div>`;
                    }

                    toPatientElement.innerHTML = toPatientHTML;
                })
                .catch(error => {
                    console.error(error);
                });

            const itemsTable = document.getElementById("invItemsTable");
            const itemsTableBody = itemsTable.querySelector("tbody");

            // Remove existing item rows
            const existingItemRows = itemsTableBody.querySelectorAll("tr.item-row");
            existingItemRows.forEach((row) => row.remove());

            // Add new item rows
            foundInvoice.items.forEach((item, idx) => {
                const row = document.createElement("tr");
                row.classList.add("item-row");

                const cells = [
                    idx + 1,
                    item.itemName,
                    item.description,
                    item.unitCost,
                    item.quantity,
                    item.unitCost * item.quantity,
                ];

                cells.forEach((cell) => {
                    const td = document.createElement("td");
                    td.style.textAlign = "center";
                    td.appendChild(document.createTextNode(cell));
                    row.appendChild(td);
                });

                const firstRow = itemsTableBody.querySelector("tr:first-child");
                itemsTableBody.insertBefore(row, firstRow);
            });
        })
        .catch(error => {
            console.error(error);
        });
}


//This function returns the current time in a formatted string, including the hour, minutes, and the day of the week.
function getFormattedTime() {
    const currentDate = new Date();
    const hour = currentDate.getHours();
    const minutes = currentDate.getMinutes();
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][currentDate.getDay()];

    const formattedTime = `${padZero(hour)}:${padZero(minutes)} - ${dayOfWeek}`;
    return formattedTime;
}

//This function pads a number with a leading zero if it is less than 10.
function padZero(number) {
    return number.toString().padStart(2, '0');
}

