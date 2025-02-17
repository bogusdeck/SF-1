angular.module('gameApp').controller('LobbyController', function($scope, $http, $window) {
    $scope.availableGames = [];
    $scope.loading = false;
    $scope.error = null;

    // Configure $http defaults
    $http.defaults.xsrfCookieName = 'csrftoken';
    $http.defaults.xsrfHeaderName = 'X-CSRFToken';
    $http.defaults.withCredentials = true;

    // Host a new game
    $scope.hostGame = function() {
        $scope.loading = true;
        $scope.error = null;

        $http({
            method: 'POST',
            url: '/game/api/host/',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            withCredentials: true
        }).then(
            function(response) {
                $scope.loading = false;
                if (response.data.success) {
                    // Redirect to the game room using room_id
                    $window.location.href = response.data.data.room_url;
                } else {
                    $scope.error = response.data.message || 'Failed to create game';
                }
            },
            function(error) {
                $scope.loading = false;
                console.error('Error hosting game:', error);
                if (error.status === 403) {
                    $scope.error = 'Authentication error. Please make sure you are logged in.';
                    if (!getCookie('sessionid')) {
                        $window.location.href = '/accounts/login/?next=/game/';
                    }
                } else {
                    $scope.error = error.data?.message || 'Failed to create game. Please try again.';
                }
            }
        );
    };

    // Show available games modal
    $scope.showAvailableGames = function() {
        $scope.loading = true;
        $scope.error = null;

        $http({
            method: 'GET',
            url: '/game/api/games/available/',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            withCredentials: true
        }).then(
            function(response) {
                $scope.loading = false;
                $scope.availableGames = response.data;
                // Show the modal using Bootstrap
                new bootstrap.Modal(document.getElementById('availableGamesModal')).show();
            },
            function(error) {
                $scope.loading = false;
                console.error('Error fetching games:', error);
                if (error.status === 403) {
                    $scope.error = 'Authentication error. Please make sure you are logged in.';
                    if (!getCookie('sessionid')) {
                        $window.location.href = '/accounts/login/?next=/game/';
                    }
                } else {
                    $scope.error = 'Failed to fetch available games. Please try again.';
                }
            }
        );
    };

    // Join an existing game
    $scope.joinGame = function(game) {
        $scope.loading = true;
        $scope.error = null;

        $http({
            method: 'POST',
            url: '/game/api/join/',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            data: { room_id: game.room_id },
            withCredentials: true
        }).then(
            function(response) {
                $scope.loading = false;
                if (response.data.success) {
                    // Redirect to the game room using room_id
                    $window.location.href = response.data.data.room_url;
                } else {
                    $scope.error = response.data.message || 'Failed to join game';
                }
            },
            function(error) {
                $scope.loading = false;
                console.error('Error joining game:', error);
                if (error.status === 403) {
                    $scope.error = 'Authentication error. Please make sure you are logged in.';
                    if (!getCookie('sessionid')) {
                        $window.location.href = '/accounts/login/?next=/game/';
                    }
                } else {
                    $scope.error = error.data?.message || 'Failed to join game. Please try again.';
                }
            }
        );
    };

    // Helper function to get CSRF token
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
});
