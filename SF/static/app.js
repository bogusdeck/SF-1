var app = angular.module('gameApp', []);

app.controller('AuthController', function ($scope, $http) {
    $scope.username = '';
    $scope.password = '';
    $scope.name = '';
    $scope.email = '';
    $scope.dob = '';
    $scope.confirmPassword = '';
    $scope.error = '';
    $scope.success = '';

    // Function to get CSRF token from cookies or meta tag
    function getCSRFToken() {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.startsWith('csrftoken=')) {
                    cookieValue = decodeURIComponent(cookie.substring(10));
                    break;
                }
            }
        }
        return cookieValue || document.querySelector("meta[name='csrf-token']")?.getAttribute("content");
    }

    // Set default CSRF header for all $http requests
    $http.defaults.headers.common["X-CSRFToken"] = getCSRFToken();

    // Login Function
    $scope.login = function () {
        if (!$scope.username || !$scope.password) {
            $scope.error = "Username and password are required!";
            return;
        }

        var data = {
            'username': $scope.username,
            'password': $scope.password
        };

        $http.post('/api/login/', data).then(function (response) {
            console.log("Login successful:", response);
            alert("Login successful!");
            window.location.href = "/dashboard";  // Redirect after login
        }).catch(function (error) {
            console.error("Login error:", error);
            $scope.error = error.data.detail || "Invalid login credentials.";
        });
    };

    // Signup Function
    $scope.signup = function () {
        if (!$scope.name || !$scope.username || !$scope.email || !$scope.password || !$scope.confirmPassword) {
            $scope.error = "All fields are required!";
            return;
        }

        if ($scope.password !== $scope.confirmPassword) {
            $scope.error = "Passwords do not match.";
            return;
        }

        var data = {
            'name': $scope.name,
            'username': $scope.username,
            'email': $scope.email,
            'dob': $scope.dob,
            'password': $scope.password
        };

        $http.post('/api/signup/', data).then(function (response) {
            console.log("Signup successful:", response);
            $scope.success = "Signup successful! Redirecting to login...";
            setTimeout(() => {
                window.location.href = "/accounts/login";  // Redirect to login page
            }, 1500);
        }).catch(function (error) {
            console.error("Signup error:", error);
            $scope.error = error.data.detail || "Signup failed. Please try again.";
        });
    };
});
