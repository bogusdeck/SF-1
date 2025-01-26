var app = angular.module('gameApp', []);

app.controller('AuthController', function($scope, $http) {
    $scope.username = '';
    $scope.password = '';

    $scope.login = function() {
        var data = {
            'username': $scope.username,
            'password': $scope.password
        };
        $http.post('/api/login/', data)
            .then(function(response) {
                console.log("Login successful:", response);
            }, function(error) {
                console.log("Error:", error);
            });
    };

    $scope.signup = function() {
        var data = {
            'username': $scope.username,
            'password': $scope.password
        };
        $http.post('/api/signup/', data)
            .then(function(response) {
                console.log("Signup successful:", response);
            }, function(error) {
                console.log("Error:", error);
            });
    };
});
