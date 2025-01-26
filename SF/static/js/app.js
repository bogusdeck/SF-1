var app = angular.module('gameApp', []);

app.config(function($interpolateProvider) {
    $interpolateProvider.startSymbol('[[');
    $interpolateProvider.endSymbol(']]');
});

// Custom filter to capitalize first letter
app.filter('capitalize', function() {
    return function(input) {
        return input ? input.charAt(0).toUpperCase() + input.slice(1).toLowerCase() : '';
    };
});

app.controller('AuthController', function($scope, $http, $window) {
    $scope.error = null;

    // Login function
    $scope.login = function() {
        $scope.error = null;
        $http.post('/api/accounts/login/', {
            email: $scope.email,
            password: $scope.password
        }).then(function(response) {
            // Redirect to game lobby on successful login
            $window.location.href = '/game/';
        }).catch(function(error) {
            $scope.error = error.data.error || 'An error occurred during login';
        });
    };

    // Signup function
    $scope.signup = function() {
        $scope.error = null;
        
        // Validate passwords match
        if ($scope.password !== $scope.confirmPassword) {
            $scope.error = 'Passwords do not match';
            return;
        }

        $http.post('/api/accounts/register/', {
            email: $scope.email,
            username: $scope.username,
            name: $scope.name,
            dob: $scope.dob,
            password: $scope.password,
            confirm_password: $scope.confirmPassword
        }).then(function(response) {
            // Redirect to login page on successful registration
            $window.location.href = '/accounts/login/';
        }).catch(function(error) {
            if (error.data && typeof error.data === 'object') {
                // Format validation errors
                let errorMessage = [];
                for (let key in error.data) {
                    if (Array.isArray(error.data[key])) {
                        errorMessage.push(error.data[key].join(' '));
                    }
                }
                $scope.error = errorMessage.join(' ');
            } else {
                $scope.error = 'An error occurred during registration';
            }
        });
    };
});
