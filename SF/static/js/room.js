var app = angular.module('gameApp', []);

app.controller('RoomController', ['$scope', '$http', function($scope, $http) {
    $scope.players = [];
    $scope.roomId = '';
    $scope.csrfToken = '';

    $scope.init = function(roomId, csrfToken) {
        console.log('Initializing with roomId:', roomId);
        $scope.roomId = roomId;
        $scope.csrfToken = csrfToken;
        $scope.refreshPlayerList();
    };

    $scope.refreshPlayerList = function() {
        $http.get('/game/api/games/' + $scope.roomId + '/players/')
            .then(function(response) {
                $scope.players = response.data.players;
            }, function(error) {
                console.error('Error fetching player list:', error);
            });
    };

    $scope.startGame = function() {
        $http.post('/game/api/games/' + $scope.roomId + '/start/', {}, {
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': $scope.csrfToken
            }
        }).then(function(response) {
            if (response.data.success) {
                window.location.reload();
            } else {
                alert(response.data.message || 'Failed to start game');
            }
        }, function(error) {
            console.error('Error starting game:', error);
            alert('Failed to start game. Please try again.');
        });
    };

    $scope.onmessage = function(event) {
        const data = JSON.parse(event.data);

        if(data.action === 'player_left') {
            $scope.player = $scope.players.filter(player=>player.username !== data.player);
            $scope.apply();
        } else if (data.action === 'move') {
            //handle player movement
        } else if (data.action === 'attack') {
            //handle player attack
        }
    }
}]);