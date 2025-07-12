// Function to encode image file to base64
function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]); // Get only the base64 part
        reader.onerror = error => reject(error);
    });
}

const imageUpload = document.getElementById('imageUpload');
const fileNameDisplay = document.getElementById('fileNameDisplay');
const imagePreview = document.getElementById('imagePreview');
const identifyButton = document.getElementById('identifyButton');
const description = document.getElementById('description');

let selectedFile = null;

imageUpload.addEventListener('change', (e) => {
    selectedFile = e.target.files[0];

    if (selectedFile) {
        fileNameDisplay.textContent = selectedFile.name;
        const reader = new FileReader();

        reader.onload = (event) => {
            imagePreview.src = event.target.result;
            imagePreview.style.display = 'block';
            identifyButton.disabled = false;
            description.textContent = 'Ready to get description.';
        }

        reader.readAsDataURL(selectedFile);
    } else {
        fileNameDisplay.textContent = 'No file chosen';
        imagePreview.src = '#';
        imagePreview.style.display = 'none';
        identifyButton.disabled = true;
        description.textContent = 'Upload an image to get started.';
    }
});

identifyButton.addEventListener('click', async () => {
    if (!selectedFile) {
        description.textContent = 'Please select an image first.';
        return;
    }

    // Prompt for API Key
    const apiKey = prompt("Please enter your Gemini API Key:");

    if (!apiKey) {
        description.textContent = 'API Key is required to get a description.';
        return;
    }

    description.textContent = 'Identifying image... Please wait.';
    identifyButton.disabled = true;

    try {
        const base64Image = await getBase64(selectedFile);

        const requestBody = {
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            inlineData: {
                                mimeType: selectedFile.type,
                                data: base64Image
                            }
                        },
                        {
                            text: "Describe this image in detail, covering its main subject, setting, and any notable features. After the description, list three related items or concepts that come to mind when looking at this image. Structure your response clearly."
                        }
                    ]
                }
            ],
            generationConfig: {
                // You can adjust these parameters as needed
                temperature: 0.7,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 800 // Limit output for browser display
            }
        };

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown API error' }));
            console.error('API Error Response:', errorData);
            throw new Error(`API request failed: ${response.status} - ${errorData.error?.message || 'Server error'}`);
        }

        const data = await response.json();

        // Extract the text content from the response
        const generatedText = data.candidates && data.candidates[0] &&
                             data.candidates[0].content &&
                             data.candidates[0].content.parts &&
                             data.candidates[0].content.parts[0] &&
                             data.candidates[0].content.parts[0].text;

        if (generatedText) {
            description.textContent = generatedText;
        } else {
            description.textContent = 'Could not generate a description. Response format unexpected.';
            console.error('Unexpected API response format:', data);
        }

    } catch (error) {
        console.error('Error:', error);
        description.textContent = `Error identifying image: ${error.message}. Please check your API key and try again.`;
    } finally {
        identifyButton.disabled = false;
    }
});