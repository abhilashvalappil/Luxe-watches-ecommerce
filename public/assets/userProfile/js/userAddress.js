
//******************/ add address

document.getElementById('addAddress-btn').addEventListener('click', async function(event){
event.preventDefault();

const name = document.getElementById('name').value;
const phone = document.getElementById('phone').value;
const pincode = document.getElementById('pincode').value;
const locality = document.getElementById('locality').value;
const address = document.getElementById('address').value;
const city = document.getElementById('city').value;
const state = document.getElementById('state').value;
const landmark = document.getElementById('landmark').value;
const addresstype = document.getElementById('addresstype').value;

const nameRegex = /^[^\s][a-zA-Z\s]*[^\s]$/;
const phoneRegex = /^[6-9]\d{9}$/;
const pincodeRegex = /^[0-9]{1,6}$/;
const localityRegex = /^[A-Za-z ]{5,}$/;
const addressRegex = /^[A-Za-z0-9.,' -]{5,}$/;
const cityRegex = /^[A-Za-z ]{5,}$/;
const stateRegex = /^[A-Za-z ]{5,}$/;
const landmarkRegex = /^[A-Za-z ]{5,}$/;
 

if(!nameRegex.test(name)){
    showError('name-error', "Please enter a valid name!")
    return;
}else{
    hideError('name-error')
}

if(!phoneRegex.test(phone)){
    showError('phone-error', "Please enter a valid phone number !")
    return;
}else{
    hideError('phone-error')
}

if(!pincodeRegex.test(pincode)){
    showError('pincode-error', "Please enter a valid pincode !")
    return;
}else{
    hideError('pincode-error')
}

if(!localityRegex.test(locality)){
    showError('locality-error', "Please enter a valid locality !")
    return;
}else{
    hideError('locality-error')
}

if(!addressRegex.test(address)){
    showError('address-error', "Please enter a valid address !")
    return;
}else{
    hideError('address-error')
}

if(!cityRegex.test(city)){
    showError('city-error', "Please enter a valid city name !")
    return;
}else{
    hideError('city-error')
}

if(!stateRegex.test(state)){
    showError('state-error', "Please enter a valid state name !")
    return;
}else{
    hideError('state-error')
}

if(!landmarkRegex.test(landmark)){
    showError('landmark-error', "Please enter a valid landmark !")
    return;
}else{
    hideError('landmark-error')
}

try {
    const response = await fetch('/add-address',{
        method: 'POST',
        headers:{
            'Content-Type' : 'application/json'
        },
        body: JSON.stringify({
            name: name,
            phone: phone,
            pincode: pincode,
            locality: locality,
            address: address,
            city: city,
            state: state,
            landmark: landmark,
            addresstype: addresstype
        })
    })
    const data = await response.json()

    if(data.success){
        Swal.fire({
            icon: 'success',
            title: data.message
        }).then(() => {
            window.location.href = '/address'
        })
    }else{
        Swal.fire({
            icon:'warning',
            title: data.message
        })
    }
    
} catch (error) {
    Swal.fire({
        icon: 'warning',
        title: 'An error occured',
    })
}

});

function showError(errorId, message) {
    let errorElement = document.getElementById(errorId);
    errorElement.textContent = message;
}

function hideError(errorId) {
    let errorElement = document.getElementById(errorId);
    errorElement.textContent = '';
}



///************************** edit

document.querySelectorAll('.update-address-btn').forEach(button => {
    button.addEventListener('click', async function(event) {
        event.preventDefault();

        const addressId = this.id.replace('update-btn', ''); 

        const id = document.getElementById(`edit-address-id${addressId}`).value;
        const name = document.getElementById(`edit-name${addressId}`).value;
        const phone = document.getElementById(`edit-phone${addressId}`).value;
        const pincode = document.getElementById(`edit-pincode${addressId}`).value;
        const locality = document.getElementById(`edit-locality${addressId}`).value;
        const address = document.getElementById(`edit-address${addressId}`).value;
        const city = document.getElementById(`edit-city${addressId}`).value;
        const state = document.getElementById(`edit-state${addressId}`).value;
        const landmark = document.getElementById(`edit-landmark${addressId}`).value;
        const addresstype = document.getElementById(`edit-address-type${addressId}`).value;
        

        try {
            const response = await fetch('/edit-address', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: id,
                    name: name,
                    phone: phone,
                    pincode: pincode,
                    locality: locality,
                    address: address,
                    city: city,
                    state: state,
                    landmark: landmark,
                    addressType: addresstype
                })
            });
            const data = await response.json();
            if(data.success){
                Swal.fire({
                    icon: 'success',
                    title: data.message
                }).then(() => {
                    window.location.reload()
                })
            }else{
                Swal.fire({
                    icon: 'warning',
                    title: data.message
                })
            }
        } catch (error) {
           console.log(error)
        }
    });
});


//****************************/ delete

const deleteButtons = document.querySelectorAll('.delete-btn-conform');

deleteButtons.forEach(button => {
    button.addEventListener('click', async function(event){
        event.preventDefault();

        const id = this.getAttribute('data-address-id');

        try {
            const response = await fetch('/delete-address', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ addressId: id })  
            });
            
            const data = await response.json();

            if(data.success){
                Swal.fire({
                    icon: 'success',
                    title: data.message
                }).then(() => {
                    window.location.reload()
                })
            }else{
                Swal.fire({
                    icon: 'warning',
                    title: data.message
                })
            }

        } catch (error) {
            console.log(error);
        }
    });
});

