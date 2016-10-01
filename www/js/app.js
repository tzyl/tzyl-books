// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
angular.module('tzyl', ['ionic', 'ionic.cloud', 'firebase', 'tzyl.controllers'])

.run(function($ionicPlatform, $rootScope, $state, Auth, User) {
    $ionicPlatform.ready(function() {
        if(window.cordova && window.cordova.plugins.Keyboard) {
            // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
            // for form inputs)
            cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);

            // Don't remove this line unless you know what you are doing. It stops the viewport
            // from snapping when text inputs are focused. Ionic handles this internally for
            // a much nicer keyboard experience.
            cordova.plugins.Keyboard.disableScroll(true);
        }
        if(window.StatusBar) {
            StatusBar.styleDefault();
        }

        // // Listen for if we are going to resolve something and if so set loading to show the spinner.
        // $scope.$on('$stateChangeStart', function(event, toState, toParams, fromState, fromParams) {
        //     if (toState.resolve) {
        //         $scope.loading = true;
        //     }
        // });

        // $scope.$on('$stateChangeSuccess', function(event, toState, toParams, fromState, fromParams) {
        //     if (toState.resolve) {
        //         $scope.loading = false;
        //     }
        // });

        // Listen for authentication state changing and take the user to the correct part of the app accordingly.
        Auth.$onAuthStateChanged(function(firebaseUser) {
            User.data = firebaseUser;
            console.log('Auth state changed', firebaseUser);
            if (!firebaseUser) {
                console.log('User not logged in. Redirecting to login page.');
                $state.go('login');
            } else {
                console.log('User is logged in. Redirecting to browse page.');
                $state.go('app.browse');
            }
        });

    });
})

// Initialize Firebase.
.config(function() {
    var config = {
        apiKey: 'AIzaSyBYIcyKl-YXcx-7VN0CbNa25_07fo--9u0',
        authDomain: 'tzylapp.firebaseapp.com',
        databaseURL: 'https://tzylapp.firebaseio.com',
        storageBucket: 'tzylapp.appspot.com',
        messagingSenderId: '254904729770'
    };
    firebase.initializeApp(config);
})

.factory('Auth', function($firebaseAuth) {
    return $firebaseAuth();
})

.factory('User', function() {
    return {data: null};
})

.factory('Listings', function($firebaseArray, $firebaseObject, $q) {
    var ref = firebase.database().ref();
    var listingsRef = ref.child('listings');

    service = {
        getAll: function() {
            return $firebaseArray(listingsRef);
        },

        getRecent: function() {
            // Most recent but unfortunately in ascending order.
            // We use an angular filter to reverse to get descending order.
            var recentQuery = listingsRef.orderByKey().limitToLast(20);
            return $firebaseArray(recentQuery);
        },

        // TODO: Change structure to keep track of user's listing (denormalize)?
        getByUser: function(uid) {
            var userQuery = listingsRef.orderByChild('uid').equalTo(uid);
            return $firebaseArray(userQuery);
        },

        getListing: function(listingId) {
            var listingRef = listingsRef.child(listingId);
            return $firebaseObject(listingRef);
        },

        searchListings: function(query) {
            // First make query not match on just full words.
            if( !query.match(/^\*/) ) { query = '*' + query; }
            if( !query.match(/\*$/) ) { query += '*'; }
            // Set up a request to search/request and save the key to listen for the response.
            var searchRef = ref.child('search');
            var key = searchRef.child('request').push({ index: 'firebase', type: 'listings', query: query }).key;
            var deferred = $q.defer();

            // Listen to the value being set on the response node.
            searchRef.child('response/' + key).on('value', function(snap) {
                if (!snap.exists()) { return; } // wait until we get data
                var data = snap.val();
                snap.ref.off('value');
                snap.ref.remove();
                if (data.error) {
                    deferred.reject(data.error);
                } else if (!data.total) {
                    deferred.reject('No results found.');
                } else {
                    var listings = data.hits.map(function(hit) {
                        return service.getListing(hit._id);
                    });
                    deferred.resolve(listings);
                }
            });

            return deferred.promise;
        }

    };

    return service;
})

// Set up link to Ionic Cloud account.
.config(function($ionicCloudProvider) {
    $ionicCloudProvider.init({
        'core': {
            'app_id': '6f9d319b'
        }
    })
})

// Default navbar to center.
.config(function($ionicConfigProvider) {
  $ionicConfigProvider.navBar.alignTitle('center');
})

.config(function($stateProvider, $urlRouterProvider) {
    $stateProvider

        .state('login', {
            url: '/login',
            templateUrl: 'templates/login.html',
            controller: 'LoginCtrl'
        })

        .state('app', {
            url: '/app',
            abstract: true,
            templateUrl: 'templates/menu.html',
            controller: 'AppCtrl'
        })

        .state('app.browse', {
            url: '/browse',
            views: {
                'menuContent': {
                    templateUrl: 'templates/browse.html',
                    controller: 'BrowseListingsCtrl'
                }
            },
            // resolve: {
            //     recent: function(Listings) {
            //         console.log('resolving');
            //         return Listings.getRecent().$loaded();
            //     }
            // }
        })

        .state('app.listings', {
                url: '/listings',
                views: {
                    'menuContent': {
                        templateUrl: 'templates/listings.html',
                        controller: 'EditListingsCtrl'
                    }
                }
            })

        .state('app.listing', {
            url: '/listings/:listingId',
            views: {
                'menuContent': {
                        templateUrl: 'templates/listing.html',
                        controller: 'ViewListingCtrl'
                }
            }
        })

        .state('app.inbox', {
                url: '/inbox',
                views: {
                    'menuContent': {
                        templateUrl: 'templates/inbox.html'
                    }
                }
            })

        .state('app.about', {
            url: '/about',
            views: {
                'menuContent': {
                    templateUrl: 'templates/about.html',
                }
            }
        })

    // .state('app.single', {
    //   url: '/playlists/:playlistId',
    //   views: {
    //     'menuContent': {
    //       templateUrl: 'templates/playlist.html',
    //       controller: 'PlaylistCtrl'
    //     }
    //   }
    // });
    // if none of the above states are matched, use this as the fallback
    $urlRouterProvider.otherwise('/app/browse');
})

// Filter to reverse AngularFire array so we have most recent first.
.filter('reverse', function() {
    return function(items, bool) {
        if (items && bool) {
            return items.slice().reverse();
        } else {
            return items;
        }
    };
});
