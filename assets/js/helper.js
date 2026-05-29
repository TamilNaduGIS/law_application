function applyInputValidation(inputId, rules = []) {
    // Rule	            Description
    //  1	            Allow only digits (0-9) — removes everything else.
    //  2	            Limit input length to 10 characters.
    //  3	            Starts with 6-9 and limits to 10 characters (like a mobile number).
    //  4	            Allow only alphanumeric characters (a-z, A-Z, 0-9).
    //  5	            Disable copy, cut, paste actions.
    //  6	            Remove all special characters (allow only word characters and spaces).
    //  7	            Validate Gmail format on blur (focus-out). Shows alert if not a Gmail address.
    //  8	            Allow digits, characters, and only allow - and _ as special characters (no other special chars)
    //  9	            Allow only digits but first number should not be 0 (removes leading zeros)
    // 10	            For name input: prevent numbers, starting character must be a letter, allow only . and space
        const inputField = $('#' + inputId);
        inputField.off('input').on('input', function () {
            let value = this.value;
            if (rules.includes(1)) {
                value = value.replace(/[^0-9]/g, '');
            }
            if (rules.includes(4)) {
                value = value.replace(/[^a-zA-Z0-9]/g, '');
            }
            if (rules.includes(6)) {
                value = value.replace(/[^\w\s]/gi, '');
            }
            if (rules.includes(8)) {
                value = value.replace(/[^a-zA-Z0-9_\-]/g, '');
            }
            if (rules.includes(9)) {
                // First remove all non-digits
                value = value.replace(/[^0-9]/g, '');
                // Then remove leading zeros
                value = value.replace(/^0+/, '');
            }
            if (rules.includes(10)) {
                // Remove any numbers
                value = value.replace(/[0-9]/g, '');
                // Allow only letters, dots, and spaces
                value = value.replace(/[^a-zA-Z.\s]/g, '');
                // Ensure first character is a letter (if value is not empty)
                if (value.length > 0 && !/^[a-zA-Z]/.test(value)) {
                    value = value.substring(1);
                }
            }
            if (rules.includes(11)) {
                // Convert lowercase to uppercase automatically
                value = value.toUpperCase();
                // Remove anything except A-Z, 0-9, and /
                value = value.replace(/[^A-Z0-9\/]/g, '');
                // Prevent starting with slash or number
                if (value.length > 0 && /^[\/0-9]/.test(value)) {
                    value = '';
                }
            }
            if (rules.includes(2) && value.length > 10) {
                value = value.substring(0, 10);
            }
    
            if (rules.includes(3)) {
                if (!/^[6-9]/.test(value)) {
                    value = value.replace(/^[^6-9]*/, '');
                }
                value = value.substring(0, 10);
            }
            if (rules.includes(7)) {
                // do nothing in input; will validate on blur
            }
    
            this.value = value;
        });
        if (rules.includes(5)) {
            inputField.on('paste', function (e) {
                e.preventDefault();
            });
            inputField.on('copy cut', function (e) {
                e.preventDefault();
            });
        }
        if (rules.includes(7)) {
            inputField.off('blur.gmailValidate').on('blur.gmailValidate', function () {
                const value = this.value.trim();
                if (value === '') return;
        
                const gmailRegex = /^[a-zA-Z0-9._%+-]+@\.com$/i;
                if (!gmailRegex.test(value)) {
                    alert('Please enter a valid Gmail address');
            
                }
            });
        }


        if (rules.includes(11)) {
            value = value.replace(/[^a-zA-Z0-9\/]/g, '');
        }
    }